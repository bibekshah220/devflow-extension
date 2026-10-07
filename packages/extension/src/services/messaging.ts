import { ErrorCode, fail } from '@devflow/shared';
import type { DevFlowRequest, ResponseFor } from '@devflow/shared';

/** Chrome rejects with opaque values; this keeps a readable message without leaking internals. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Chrome's messaging APIs reject when no receiver is listening, which is a normal
 * condition (service worker asleep, content script not yet injected). These wrappers
 * turn that into the standard envelope so callers never deal with raw rejections.
 */

export async function sendToBackground<TRequest extends DevFlowRequest>(
  request: TRequest,
): Promise<ResponseFor<TRequest>> {
  try {
    return await chrome.runtime.sendMessage<TRequest, ResponseFor<TRequest>>(request);
  } catch (error) {
    return fail(ErrorCode.INTERNAL_ERROR, describeError(error));
  }
}

export async function sendToTab<TRequest extends DevFlowRequest>(
  tabId: number,
  request: TRequest,
): Promise<ResponseFor<TRequest>> {
  try {
    return await chrome.tabs.sendMessage<TRequest, ResponseFor<TRequest>>(tabId, request);
  } catch (error) {
    return fail(ErrorCode.INTERNAL_ERROR, describeError(error));
  }
}
