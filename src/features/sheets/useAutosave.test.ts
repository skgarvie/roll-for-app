import { act, renderHook } from '@testing-library/react';
import { clearAutosaveHistory, useAutosave } from './useAutosave';

interface Doc {
  text: string;
  n: number;
}

function setup(initial: Doc = { text: '', n: 0 }) {
  const saves: Doc[] = [];
  const save = vi.fn(async (d: Doc) => {
    saves.push(d);
  });
  const hook = renderHook(
    ({ stored }: { stored: Doc }) => useAutosave({ id: 'doc', stored, save, delay: 300 }),
    { initialProps: { stored: initial } },
  );
  return { ...hook, save, saves };
}

beforeEach(() => {
  vi.useFakeTimers();
  clearAutosaveHistory();
});
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('applies edits immediately and writes once after the debounce', async () => {
    const { result, save, saves } = setup();
    act(() => result.current.update((d) => ({ ...d, text: 'a' })));
    act(() => result.current.update((d) => ({ ...d, text: 'ab' })));
    expect(result.current.value.text).toBe('ab');
    expect(result.current.status).toBe('pending');
    expect(save).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(saves).toEqual([{ text: 'ab', n: 0 }]);
    expect(result.current.status).toBe('saved');
  });

  it('undo restores the previous value and saves it; coalesced edits are one step', async () => {
    const { result, saves } = setup();
    act(() => result.current.update((d) => ({ ...d, n: 1 })));
    act(() => result.current.update((d) => ({ ...d, text: 'h' }), { coalesce: 'text' }));
    act(() => result.current.update((d) => ({ ...d, text: 'hi' }), { coalesce: 'text' }));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.value).toEqual({ text: '', n: 1 });
    act(() => result.current.undo());
    expect(result.current.value).toEqual({ text: '', n: 0 });
    expect(result.current.canUndo).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(saves.at(-1)).toEqual({ text: '', n: 0 });
  });

  it('ignores stored changes while edits are unsaved, then follows them', async () => {
    const { result, rerender } = setup();
    act(() => result.current.update((d) => ({ ...d, n: 5 })));
    rerender({ stored: { text: 'from elsewhere', n: 0 } });
    expect(result.current.value.n).toBe(5);

    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ stored: { text: 'newer', n: 9 } });
    expect(result.current.value).toEqual({ text: 'newer', n: 9 });
  });

  it('flushes pending edits on unmount', async () => {
    const { result, unmount, saves } = setup();
    act(() => result.current.update((d) => ({ ...d, n: 3 })));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saves).toEqual([{ text: '', n: 3 }]);
  });

  it('keeps the edit and reports an error when saving fails', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Disk full')).mockResolvedValue(undefined);
    const stored: Doc = { text: '', n: 0 };
    const { result } = renderHook(() => useAutosave({ id: 'doc', stored, save }));
    act(() => result.current.update((d) => ({ ...d, n: 1 })));
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Disk full');

    act(() => result.current.update((d) => ({ ...d, n: 2 })));
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(result.current.status).toBe('saved');
    expect(save).toHaveBeenLastCalledWith({ text: '', n: 2 });
  });
});
