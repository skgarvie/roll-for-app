import { InstallHint } from '@/pwa/InstallHint';
import { UpdatePrompt } from '@/pwa/UpdatePrompt';
import { isStandalone } from '@/pwa/environment';
import { formatBytes } from '@/pwa/storage';
import { useStorageStatus } from '@/pwa/useStorageStatus';

export function App() {
  const storage = useStorageStatus();

  return (
    <div className="app-chrome flex h-full flex-col">
      <header className="pt-safe px-safe flex items-center gap-3 border-b border-stone-200 bg-white/80 pb-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
        <img src="/logo.svg" alt="" className="size-9" />
        <h1 className="text-2xl font-bold tracking-tight">RollFor</h1>
      </header>

      <main className="px-safe pb-safe mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto py-6">
        <InstallHint />

        <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="mt-1 text-stone-500">No campaigns yet. (Coming in M1.)</p>
        </section>

        <section
          aria-labelledby="env-heading"
          className="rounded-xl bg-white p-5 shadow-sm dark:bg-stone-900"
        >
          <h2 id="env-heading" className="text-lg font-semibold">
            Device status
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-stone-500">Installed app</dt>
            <dd>{isStandalone() ? 'Yes' : 'No (running in browser)'}</dd>
            <dt className="text-stone-500">Persistent storage</dt>
            <dd>
              {storage === undefined
                ? 'Checking…'
                : !storage.supported
                  ? 'Not supported'
                  : storage.persisted
                    ? 'Granted'
                    : 'Not granted'}
            </dd>
            <dt className="text-stone-500">Storage used</dt>
            <dd>
              {formatBytes(storage?.usageBytes)} of {formatBytes(storage?.quotaBytes)}
            </dd>
            <dt className="text-stone-500">Version</dt>
            <dd>{__APP_VERSION__}</dd>
          </dl>
        </section>
      </main>

      <UpdatePrompt />
    </div>
  );
}
