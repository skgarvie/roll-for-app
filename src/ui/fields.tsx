import { Minus, Plus } from 'lucide-react';
import { useId, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from './cx';

export const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

/** A titled card section of a sheet. */
export function Section({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cx('rounded-2xl bg-white p-4 shadow-sm sm:p-5 dark:bg-stone-900', className)}
    >
      <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">{title}</h3>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Integer input with a numeric keypad. Keeps its own text while focused so
 * partial input ("-", "") doesn't fight the stored value.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  label,
  className,
  id,
  placeholder,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
  id?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? '' : String(value));

  const commit = (text: string) => {
    if (text.trim() === '') return onChange(undefined);
    const n = Number.parseInt(text, 10);
    if (Number.isNaN(n)) return;
    onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="-?[0-9]*"
      aria-label={label}
      placeholder={placeholder}
      autoComplete="off"
      value={shown}
      onFocus={(e) => {
        setDraft(e.target.value);
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        if (/^-?\d+$/.test(e.target.value)) commit(e.target.value);
      }}
      onBlur={(e) => {
        commit(e.target.value);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={cx(inputClass, 'text-center tabular-nums', className)}
    />
  );
}

/** − value + with 44pt buttons. */
export function Stepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  label,
  format = String,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  format?: (n: number) => string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="inline-flex size-11 items-center justify-center rounded-lg bg-stone-200 text-stone-800 active:bg-stone-300 disabled:opacity-40 dark:bg-stone-800 dark:text-stone-100"
      >
        <Minus className="size-5" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className="min-w-10 text-center text-lg font-semibold tabular-nums"
      >
        {format(value)}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="inline-flex size-11 items-center justify-center rounded-lg bg-stone-200 text-stone-800 active:bg-stone-300 disabled:opacity-40 dark:bg-stone-800 dark:text-stone-100"
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/** Toggle chip (aria-pressed). */
export function Chip({
  pressed,
  onToggle,
  children,
  className,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cx(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
        pressed
          ? 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100'
          : 'border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SelectField({
  label,
  hint,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <select id={id} className={cx(inputClass, 'min-h-11', className)} {...props}>
        {children}
      </select>
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

/** Labelled NumberInput. */
export function NumberField({
  label,
  hint,
  ...props
}: Omit<Parameters<typeof NumberInput>[0], 'id'> & { hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <NumberInput id={id} {...props} label={label} />
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
    </div>
  );
}
