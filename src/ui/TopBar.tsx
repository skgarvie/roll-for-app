import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from './cx';

export interface TopBarProps {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  /** Leading content when there's no back link (e.g. the app logo). */
  leading?: ReactNode;
  actions?: ReactNode;
  /** Set false when a parent container handles stickiness (e.g. top bar + tabs). */
  sticky?: boolean;
}

export function TopBar({ title, subtitle, back, leading, actions, sticky = true }: TopBarProps) {
  return (
    <header
      className={cx(
        'pt-safe px-safe flex items-center gap-2 border-b border-stone-200 bg-white/85 pb-2 backdrop-blur dark:border-stone-800 dark:bg-stone-900/85',
        // Always on its own layer above siblings (e.g. the sheet tabs) so menus aren't covered.
        sticky ? 'sticky top-0 z-30' : 'relative z-10',
      )}
    >
      {back ? (
        <Link
          to={back.to}
          aria-label={back.label}
          title={back.label}
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
      ) : (
        leading
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}
