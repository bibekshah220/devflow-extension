import { ErrorCode, fail, ok } from '@devflow/shared';
import type { PingRequest } from '@devflow/shared';

declare global {
  interface Window {
    __devflowContentScriptReady?: true;
  }
}

function isPing(value: unknown): value is PingRequest {
  return (
    typeof value === 'object' && value !== null && 'type' in value && value.type === 'devflow:ping'
  );
}

// chrome.scripting re-runs this file on every injection; without the guard each
// run would register another listener and the page would answer N times.
if (!window.__devflowContentScriptReady) {
  window.__devflowContentScriptReady = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isPing(message)) {
      sendResponse(fail(ErrorCode.VALIDATION_ERROR, 'Unrecognized message.'));
      return false;
    }
    sendResponse(ok({ ready: true as const, url: window.location.href }));
    return false;
  });
}
