import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** The "ready offline" note is informational, so it dismisses itself. */
const OFFLINE_READY_MS = 4000;

/**
 * Registers the service worker and shows a toast when a new version is waiting.
 * We never reload automatically so an update can't interrupt a game session.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Don't leave it covering buttons (e.g. the wizard's Next) for the whole session.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const t = setTimeout(() => setOfflineReady(false), OFFLINE_READY_MS);
    return () => clearTimeout(t);
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      className="fixed right-4 bottom-[max(env(safe-area-inset-bottom),1rem)] z-50 flex max-w-sm items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-stone-50 shadow-lg dark:bg-stone-100 dark:text-stone-900"
    >
      <span className="flex-1">
        {needRefresh
          ? 'A new version of RollFor is available.'
          : 'RollFor is ready to work offline.'}
      </span>
      {needRefresh && (
        <button
          type="button"
          className="min-h-11 rounded-lg bg-amber-500 px-3 font-semibold text-stone-950"
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
      )}
      <button type="button" className="min-h-11 px-2 opacity-70" onClick={close}>
        {needRefresh ? 'Later' : 'OK'}
      </button>
    </div>
  );
}
