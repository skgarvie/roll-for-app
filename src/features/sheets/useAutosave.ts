import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UpdateOptions {
  /**
   * Edits with the same key within COALESCE_MS share one undo step
   * (e.g. typing in a text field). Omit for discrete actions.
   */
  coalesce?: string;
}

export interface Autosave<T> {
  value: T;
  update: (fn: (prev: T) => T, options?: UpdateOptions) => void;
  undo: () => void;
  canUndo: boolean;
  status: SaveStatus;
  error?: string;
}

const COALESCE_MS = 1000;
const MAX_HISTORY = 50;

// Undo history per document, kept for the session so switching tabs doesn't lose it.
const histories = new Map<string, unknown[]>();

/**
 * Local editing state for a stored document with debounced writes.
 *
 * - Edits apply immediately to local state and are written after `delay` ms.
 * - Pending writes are flushed when the component unmounts or the page is hidden.
 * - While there are unsaved edits, changes coming from the database are ignored;
 *   otherwise the local value follows the stored one (e.g. edits from another tab).
 */
export function useAutosave<T>({
  id,
  stored,
  save,
  delay = 300,
}: {
  /** Identity of the document (for undo history). Key the component by it too. */
  id: string;
  /** The stored value. Must keep its identity until the stored data changes (memoize it). */
  stored: T;
  save: (value: T) => Promise<void>;
  delay?: number;
}): Autosave<T> {
  const [value, setValue] = useState(stored);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>();
  const [historySize, setHistorySize] = useState(() => histories.get(id)?.length ?? 0);
  // True from an edit until it has been written. State (not a ref) so render can read it.
  const [unsaved, setUnsaved] = useState(false);

  const valueRef = useRef(stored);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastEdit = useRef<{ key?: string; at: number }>({ at: 0 });
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Follow the database while there's nothing unsaved (e.g. edits from another tab).
  const [prevStored, setPrevStored] = useState(stored);
  if (prevStored !== stored) {
    setPrevStored(stored);
    if (!unsaved) setValue(stored);
  }

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!dirty.current) return;
    // Wait for an earlier write so writes land in order.
    if (inFlight.current) await inFlight.current;
    if (!dirty.current) return;
    dirty.current = false;
    const snapshot = valueRef.current;
    setStatus('saving');
    const write = saveRef
      .current(snapshot)
      .then(() => {
        setError(undefined);
        setStatus(dirty.current ? 'pending' : 'saved');
        if (!dirty.current) setUnsaved(false);
      })
      .catch((err: unknown) => {
        dirty.current = true;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = write;
    await write;
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    setUnsaved(true);
    setStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [delay, flush]);

  const update = useCallback(
    (fn: (prev: T) => T, options?: UpdateOptions) => {
      const prev = valueRef.current;
      const next = fn(prev);
      if (Object.is(next, prev)) return;

      const now = Date.now();
      const key = options?.coalesce;
      const coalesced =
        key !== undefined &&
        lastEdit.current.key === key &&
        now - lastEdit.current.at < COALESCE_MS;
      lastEdit.current = { key, at: now };
      if (!coalesced) {
        const history = histories.get(id) ?? [];
        history.push(prev);
        if (history.length > MAX_HISTORY) history.shift();
        histories.set(id, history);
        setHistorySize(history.length);
      }

      valueRef.current = next;
      setValue(next);
      schedule();
    },
    [id, schedule],
  );

  const undo = useCallback(() => {
    const history = histories.get(id);
    const prev = history?.pop() as T | undefined;
    if (prev === undefined) return;
    setHistorySize(history!.length);
    lastEdit.current = { at: 0 };
    valueRef.current = prev;
    setValue(prev);
    schedule();
  }, [id, schedule]);

  // Flush when the app goes to the background (iOS may kill it) and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return { value, update, undo, canUndo: historySize > 0, status, error };
}

/** For tests. */
export function clearAutosaveHistory() {
  histories.clear();
}
