import { describeError } from '../services/messaging';
import { dispatch } from './handlers';

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void dispatch(message).then(sendResponse);
  return true; // keeps the message channel open for the async response
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.error('[devflow] failed to set side panel behavior:', describeError(error));
});
