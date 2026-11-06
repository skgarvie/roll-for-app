import type { ButtonHTMLAttributes } from 'react';
import { buttonBase, buttonStyles, type ButtonVariant } from './buttonStyles';
import { cx } from './cx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className, ...props }: ButtonProps) {
  return (
    <button type="button" className={cx(buttonBase, buttonStyles[variant], className)} {...props} />
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/** Square 44pt touch target with an accessible label. */
export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
