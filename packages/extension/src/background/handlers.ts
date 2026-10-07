import { ErrorCode, fail } from '@devflow/shared';
import type { ApiResponse, DevFlowRequest, DevFlowResultMap } from '@devflow/shared';
import { describeError, sendToTab } from '../services/messaging';

export const CONTENT_SCRIPT = 'content.js';

/** Chrome refuses injection on these regardless of granted permissions. */
const RESTRICTED_SCHEME = /^(chrome|chrome-extension|devtools|about|edge|view-source):/i;
const WEB_STORE = /^https:\/\/chromewebstore\.google\.com\//i;

type Handlers = {
  [TType in DevFlowRequest['type']]: (
    request: Extract<DevFlowRequest, { type: TType }>,
  ) => Promise<ApiResponse<DevFlowResultMap[TType]>>;
};

export const handlers: Handlers = {
  'devflow:ping': async (request) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id === undefined) {
      return fail(ErrorCode.NOT_FOUND, 'No active tab.');
    }

    // tabs.query omits url unless this tab is readable: either activeTab is live for
    // it, or a host permission covers it. A missing url means no access, not no tab.
    if (tab.url === undefined) {
      return fail(ErrorCode.FORBIDDEN, 'DevFlow needs permission to read this tab.', {
        needsHostPermission: true,
      });
    }

    if (RESTRICTED_SCHEME.test(tab.url) || WEB_STORE.test(tab.url)) {
      return fail(ErrorCode.FORBIDDEN, 'Chrome blocks extensions on this page.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [CONTENT_SCRIPT],
      });
    } catch (error) {
      return fail(ErrorCode.FORBIDDEN, `Cannot access this page: ${describeError(error)}`);
    }

    return sendToTab(tab.id, request);
  },
};

export function isDevFlowRequest(value: unknown): value is DevFlowRequest {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return typeof value.type === 'string' && Object.hasOwn(handlers, value.type);
}

export async function dispatch(message: unknown): Promise<ApiResponse<unknown>> {
  if (!isDevFlowRequest(message)) {
    return fail(ErrorCode.VALIDATION_ERROR, 'Unrecognized message.');
  }

  // The only cast in the router: isDevFlowRequest narrows the union as a whole, but
  // cannot tie this specific member back to its own handler's parameter type.
  const handler = handlers[message.type] as (
    request: DevFlowRequest,
  ) => Promise<ApiResponse<unknown>>;

  try {
    return await handler(message);
  } catch (error) {
    return fail(ErrorCode.INTERNAL_ERROR, describeError(error));
  }
}
