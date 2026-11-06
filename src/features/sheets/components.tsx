import { Check, CloudAlert, LoaderCircle, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { DerivedKey } from '@/domain/character';
import type { DerivedValue } from '@/domain/derive';
import { Button, IconButton } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Dialog } from '@/ui/Dialog';
import { NumberField } from '@/ui/fields';
import type { CoreEditor } from './coreEditor';
import { formatStat, type StatFormat } from './format';
import type { SaveStatus } from './useAutosave';

export function SaveIndicator({ status, error }: { status: SaveStatus; error?: string }) {
  if (status === 'idle') return null;
  if (status === 'error') {
    return (
      <span role="alert" className="inline-flex items-center gap-1 text-sm text-red-600">
        <CloudAlert className="size-4" aria-hidden />
        Not saved{error ? `: ${error}` : ''}
      </span>
    );
  }
  const saved = status === 'saved';
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1 text-sm text-stone-500 transition-opacity"
    >
      {saved ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      )}
      {saved ? 'Saved' : 'Saving…'}
    </span>
  );
}

/** Sheet title row with save status and undo. */
export function SheetHeader({
  title,
  subtitle,
  editor,
}: {
  title: string;
  subtitle?: ReactNode;
  editor: CoreEditor;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {subtitle && <p className="text-stone-500">{subtitle}</p>}
      </div>
      <SaveIndicator status={editor.status} error={editor.error} />
      <IconButton label="Undo last change" disabled={!editor.canUndo} onClick={editor.undo}>
        <Undo2 className={cx('size-5', !editor.canUndo && 'opacity-40')} aria-hidden />
      </IconButton>
    </div>
  );
}

/** Marks for an overridden value or an exhaustion penalty. */
function StatMarks({ value, format }: { value: DerivedValue; format: StatFormat }) {
  return (
    <>
      {value.overridden && (
        <span className="text-xs font-semibold text-amber-600" title="Overridden">
          ✎<span className="sr-only"> (overridden)</span>
        </span>
      )}
      {value.penalty > 0 && (
        <span className="text-xs font-medium text-red-600" title="Exhaustion penalty">
          {format === 'feet' ? `−${value.penalty} ft` : `−${value.penalty}`}
          <span className="sr-only"> exhaustion</span>
        </span>
      )}
    </>
  );
}

/**
 * A computed value. Tap to override it (or clear the override).
 * `variant="tile"` is a big stat box; `inline` is a compact value for lists.
 */
export function DerivedStat({
  label,
  value,
  overrideKey,
  editor,
  format = 'modifier',
  variant = 'tile',
  hint,
}: {
  label: string;
  value: DerivedValue;
  overrideKey: DerivedKey;
  editor: CoreEditor;
  format?: StatFormat;
  variant?: 'tile' | 'inline';
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = formatStat(value.total, format);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label} ${shown}${value.overridden ? ' (overridden)' : ''}. Edit`}
        className={cx(
          'transition-colors',
          variant === 'tile'
            ? 'flex min-h-20 flex-col items-center justify-center rounded-xl border border-stone-200 px-3 py-2 hover:border-amber-400 dark:border-stone-700'
            : 'inline-flex min-h-11 min-w-14 items-center justify-end gap-1 rounded-lg px-2 hover:bg-stone-100 dark:hover:bg-stone-800',
        )}
      >
        {variant === 'tile' ? (
          <>
            <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {label}
            </span>
            <span className="text-2xl font-bold tabular-nums" data-testid={`stat-${overrideKey}`}>
              {shown}
            </span>
            <span className="flex gap-1">
              <StatMarks value={value} format={format} />
            </span>
          </>
        ) : (
          <>
            <StatMarks value={value} format={format} />
            <span className="font-semibold tabular-nums" data-testid={`stat-${overrideKey}`}>
              {shown}
            </span>
          </>
        )}
      </button>
      {open && (
        <OverrideDialog
          label={label}
          value={value}
          overrideKey={overrideKey}
          editor={editor}
          format={format}
          hint={hint}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function OverrideDialog({
  label,
  value,
  overrideKey,
  editor,
  format,
  hint,
  onClose,
}: {
  label: string;
  value: DerivedValue;
  overrideKey: DerivedKey;
  editor: CoreEditor;
  format: StatFormat;
  hint?: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<number | undefined>(
    value.overridden ? value.value : undefined,
  );

  const apply = (override: number | undefined) => {
    editor.update((d) => {
      const overrides = { ...d.overrides };
      if (override === undefined) delete overrides[overrideKey];
      else overrides[overrideKey] = override;
      return { ...d, overrides };
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={label}>
      <p>
        Calculated: <strong>{formatStat(value.computed, format)}</strong>
        {value.penalty > 0 && (
          <span className="text-stone-500">
            {' '}
            (exhaustion {format === 'feet' ? `−${value.penalty} ft` : `−${value.penalty}`} is
            applied on top)
          </span>
        )}
      </p>
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
        className="space-y-4"
      >
        <NumberField
          label="Override"
          hint="Leave empty to use the calculated value."
          value={draft}
          onChange={setDraft}
          placeholder={String(value.computed)}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {value.overridden && (
            <Button variant="ghost" onClick={() => apply(undefined)}>
              Use calculated
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
