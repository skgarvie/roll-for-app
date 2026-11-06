import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

export interface MenuProps {
  /** Accessible label of the trigger button. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
}

/** Dropdown menu anchored to the top-right of its trigger. */
export function Menu({ label, trigger, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        {trigger}
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-40 mt-1 min-w-64 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        >
          {items
            .filter((item) => !item.hidden)
            .map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cx(
                    'flex min-h-11 w-full items-center gap-3 px-4 text-left hover:bg-stone-100 dark:hover:bg-stone-800',
                    item.danger && 'text-red-600 dark:text-red-400',
                  )}
                >
                  <span className="size-5 shrink-0" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
