import { useCallback, useState } from 'react';
import { isOk } from '@devflow/shared';
import type { ApiErrorBody, DevFlowResultMap } from '@devflow/shared';
import { describeError, sendToBackground } from '../services/messaging';

/** Matches optional_host_permissions in the manifest. Requested on demand, never at install. */
const HOST_ACCESS = '*://*/*';

function needsHostPermission(status: Status): boolean {
  return status.kind === 'error' && status.error.details?.needsHostPermission === true;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; page: DevFlowResultMap['devflow:ping'] }
  | { kind: 'error'; error: ApiErrorBody };

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [grantNote, setGrantNote] = useState<string | null>(null);

  const checkPage = useCallback(() => {
    setStatus({ kind: 'loading' });
    void sendToBackground({ type: 'devflow:ping' }).then((response) => {
      setStatus(
        isOk(response)
          ? { kind: 'ready', page: response.data }
          : { kind: 'error', error: response.error },
      );
    });
  }, []);

  // Some Chrome builds will not surface the permission prompt from a side panel: the
  // call resolves false, or rejects, with no prompt shown. Neither is a denial, so the
  // outcome is reported and the grant page offered as a tab the prompt can appear in.
  const requestAccess = useCallback(() => {
    setGrantNote(null);
    chrome.permissions
      .request({ origins: [HOST_ACCESS] })
      .then((granted) => {
        if (granted) checkPage();
        else setGrantNote('Chrome did not grant access from the side panel.');
      })
      .catch((error: unknown) => {
        setGrantNote(describeError(error));
      });
  }, [checkPage]);

  const openGrantPage = useCallback(() => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('grant.html') });
  }, []);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-sm text-zinc-200">
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="font-medium tracking-tight">DevFlow AI</span>
        <span className="font-mono text-[11px] text-zinc-500">v0.1.0</span>
      </header>

      <main className="flex-1 overflow-auto p-3">
        <button
          type="button"
          onClick={checkPage}
          disabled={status.kind === 'loading'}
          className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          {status.kind === 'loading' ? 'Checking…' : 'Check active page'}
        </button>

        <div className="mt-3">
          {status.kind === 'idle' && (
            <p className="text-xs text-zinc-500">
              Connects to the active tab and reports what DevFlow can see. Nothing is sent anywhere.
            </p>
          )}

          {status.kind === 'ready' && (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2">
              <p className="text-xs text-emerald-400">Connected</p>
              <p className="mt-1 break-all font-mono text-[11px] text-zinc-400">
                {status.page.url}
              </p>
            </div>
          )}

          {status.kind === 'error' && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2">
              <p className="font-mono text-[11px] text-red-400">{status.error.code}</p>
              <p className="mt-1 text-xs text-zinc-300">{status.error.message}</p>
              {needsHostPermission(status) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={requestAccess}
                    className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800"
                  >
                    Grant access to this site
                  </button>
                  {grantNote !== null && (
                    <button
                      type="button"
                      onClick={openGrantPage}
                      className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800"
                    >
                      Open permission page
                    </button>
                  )}
                </div>
              )}
              {grantNote !== null && (
                <p className="mt-2 text-[11px] text-amber-400">
                  {grantNote} Use the permission page instead.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
