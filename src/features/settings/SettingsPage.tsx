import { isStandalone } from '@/pwa/environment';
import { formatBytes } from '@/pwa/storage';
import { useStorageStatus } from '@/pwa/useStorageStatus';
import { TopBar } from '@/ui/TopBar';

export function SettingsPage() {
  const storage = useStorageStatus();

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Settings" back={{ to: '/', label: 'Back to campaigns' }} />
      <main className="px-safe pb-safe mx-auto w-full max-w-2xl flex-1 space-y-4 py-6">
        <section
          aria-labelledby="device-heading"
          className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900"
        >
          <h2 id="device-heading" className="text-lg font-semibold">
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
    </div>
  );
}
