import { useState } from 'react';
import { isIOSLike, isStandalone } from './environment';

const DISMISS_KEY = 'rollfor:install-hint-dismissed';

/**
 * iOS has no install prompt API, so explain how to add RollFor to the Home
 * Screen. Installed apps keep their data far more reliably than Safari tabs.
 */
export function InstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || isStandalone() || !isIOSLike()) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore: private mode or storage blocked
    }
    setDismissed(true);
  };

  return (
    <aside className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-semibold">Install RollFor on your iPad</p>
      <p className="mt-1">
        Tap <span aria-label="Share">Share</span> in Safari, then{' '}
        <strong>Add to Home Screen</strong>. The installed app works offline and keeps your
        characters safe from Safari&rsquo;s storage clean-up. Note: data in Safari and in the
        installed app are stored separately.
      </p>
      <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={dismiss}>
        Got it
      </button>
    </aside>
  );
}
