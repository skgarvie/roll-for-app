export type StorageStatus = {
  supported: boolean;
  persisted: boolean;
  usageBytes?: number;
  quotaBytes?: number;
};

/**
 * Ask the browser to keep our data (IndexedDB etc.) from being evicted.
 * On iOS this matters most for Safari tabs; Home Screen apps are exempt from
 * the 7-day eviction rule but asking costs nothing.
 */
export async function requestPersistentStorage(): Promise<StorageStatus> {
  const storage = navigator.storage;
  if (!storage?.persist) return { supported: false, persisted: false };

  let persisted = (await storage.persisted?.()) ?? false;
  if (!persisted) {
    try {
      persisted = await storage.persist();
    } catch {
      persisted = false;
    }
  }

  const estimate = await storage.estimate?.().catch(() => undefined);
  return {
    supported: true,
    persisted,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
  };
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
