import { ErrorCode, fail } from '@devflow/shared';
import type { ApiResponse, DevFlowRequest, DevFlowResultMap } from '@devflow/shared';
import { describeError, sendToTab } from '../services/messaging';

const CONTENT_SCRIPT = 'content.js';

/** Chrome refuses injection on these regardless of granted permissions. */
const RESTRICTED_SCHEME = /^(chrome|chrome-extension|devtools|about|edge|view-source):/i;
const WEB_STORE = /^https:\/\/chromewebstore\.google\.com\//i;

type Handlers = {
  [TType in DevFlowRequest['type']]: (
    request: Extract<DevFlowRequest, { type: TType }>,
  ) => Promise<ApiResponse<DevFlowResultMap[TType]>>;
};

const handlers: Handlers = {
  'devflow:ping': async (request) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id === undefined || tab.url === undefined) {
      return fail(ErrorCode.NOT_FOUND, 'No active tab.');
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

function isDevFlowRequest(value: unknown): value is DevFlowRequest {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return typeof value.type === 'string' && Object.hasOwn(handlers, value.type);
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isDevFlowRequest(message)) {
    sendResponse(fail(ErrorCode.VALIDATION_ERROR, 'Unrecognized message.'));
    return false;
  }

  // The only cast in the router: isDevFlowRequest has narrowed the union as a whole,
  // but cannot tie this specific member back to its handler's parameter type.
  const handler = handlers[message.type] as (
    request: DevFlowRequest,
  ) => Promise<ApiResponse<unknown>>;

  handler(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse(fail(ErrorCode.INTERNAL_ERROR, describeError(error)));
    });

  return true; // keeps the message channel open for the async response
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.error('[devflow] failed to set side panel behavior:', describeError(error));
});
