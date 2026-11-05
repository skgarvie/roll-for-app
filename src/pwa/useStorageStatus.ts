import { useEffect, useState } from 'react';
import { requestPersistentStorage, type StorageStatus } from './storage';

export function useStorageStatus(): StorageStatus | undefined {
  const [status, setStatus] = useState<StorageStatus>();
  useEffect(() => {
    let cancelled = false;
    void requestPersistentStorage().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
