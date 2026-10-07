import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@devflow/shared';
import { CONTENT_SCRIPT, dispatch } from './handlers';

const tabsQuery = vi.fn();
const tabsSendMessage = vi.fn();
const executeScript = vi.fn();

vi.stubGlobal('chrome', {
  tabs: { query: tabsQuery, sendMessage: tabsSendMessage },
  scripting: { executeScript },
});

const PING = { type: 'devflow:ping' } as const;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('dispatch', () => {
  it.each([
    ['a non-object', 'devflow:ping'],
    ['null', null],
    ['an object with no type', {}],
    ['an unregistered type', { type: 'devflow:not-a-real-message' }],
    ['a non-string type', { type: 42 }],
  ])('rejects %s without touching Chrome', async (_label, message) => {
    const response = await dispatch(message);

    expect(response).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Unrecognized message.' },
    });
    expect(tabsQuery).not.toHaveBeenCalled();
  });
});

describe('devflow:ping', () => {
  it('reports NOT_FOUND when there is no active tab', async () => {
    tabsQuery.mockResolvedValue([]);

    const response = await dispatch(PING);

    expect(response).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No active tab.' },
    });
  });

  // Regression: a tab with no readable url used to collapse into "No active tab.",
  // which is both wrong and unactionable. It means the tab is not readable yet.
  it('flags a missing host permission when the tab url is hidden', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: undefined }]);

    const response = await dispatch(PING);

    expect(response).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'DevFlow needs permission to read this tab.',
        details: { needsHostPermission: true },
      },
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it.each([
    'chrome://extensions',
    'chrome-extension://abc/sidepanel.html',
    'devtools://devtools/bundled/panel.html',
    'about:blank',
    'view-source:https://example.com',
    'https://chromewebstore.google.com/detail/abc',
  ])('refuses %s without attempting injection', async (url) => {
    tabsQuery.mockResolvedValue([{ id: 7, url }]);

    const response = await dispatch(PING);

    expect(response).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Chrome blocks extensions on this page.' },
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('surfaces an injection failure as FORBIDDEN', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com' }]);
    executeScript.mockRejectedValue(new Error('Cannot access contents of the page'));

    const response = await dispatch(PING);

    expect(response).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Cannot access this page: Cannot access contents of the page',
      },
    });
    expect(tabsSendMessage).not.toHaveBeenCalled();
  });

  it('injects the content script, then forwards the request to the tab', async () => {
    const page = { ready: true as const, url: 'https://example.com/docs' };
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/docs' }]);
    executeScript.mockResolvedValue([]);
    tabsSendMessage.mockResolvedValue(ok(page));

    const response = await dispatch(PING);

    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: [CONTENT_SCRIPT],
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(7, PING);
    expect(response).toEqual({ success: true, data: page });
  });

  it('returns an envelope when the content script never answers', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com' }]);
    executeScript.mockResolvedValue([]);
    tabsSendMessage.mockRejectedValue(new Error('Receiving end does not exist'));

    const response = await dispatch(PING);

    expect(response).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Receiving end does not exist' },
    });
  });

  it('converts an unexpected throw into INTERNAL_ERROR rather than rejecting', async () => {
    tabsQuery.mockRejectedValue(new Error('Tabs API unavailable'));

    const response = await dispatch(PING);

    expect(response).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Tabs API unavailable' },
    });
  });
});
