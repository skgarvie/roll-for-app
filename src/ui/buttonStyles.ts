/** Shared so links can look like buttons. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:bg-amber-600',
  secondary:
    'bg-stone-200 text-stone-900 hover:bg-stone-300 active:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
  ghost: 'text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
};

export const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';
