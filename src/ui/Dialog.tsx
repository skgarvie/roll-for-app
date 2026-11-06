import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import type { ButtonVariant } from './buttonStyles';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons shown at the bottom right. */
  footer?: ReactNode;
}

/**
 * Modal built on the native <dialog> element (focus trapping, Escape to close,
 * top-layer rendering). Content only mounts while open, so forms start fresh.
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // Clicks on the backdrop land on the <dialog> element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-black/40 dark:bg-stone-900 dark:text-stone-100"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="space-y-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  /** Throw to keep the dialog open and show the error message. */
  onSubmit: () => Promise<void> | void;
  children: ReactNode;
  submitDisabled?: boolean;
}

/** Dialog wrapping a form with Cancel / submit buttons and error display. */
export function FormDialog({
  open,
  onClose,
  title,
  submitLabel,
  submitVariant = 'primary',
  onSubmit,
  children,
  submitDisabled,
}: FormDialogProps) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setError(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant={submitVariant} disabled={busy || submitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
