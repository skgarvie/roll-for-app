import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/ui/Button';
import { TopBar } from '@/ui/TopBar';

/** Error boundary for routes; also used as the catch-all "not found" page. */
export function RouteError({ notFound: isCatchAll = false }: { notFound?: boolean }) {
  const error = useRouteError();
  const notFound = isCatchAll || (isRouteErrorResponse(error) && error.status === 404);
  const message = notFound
    ? 'There’s nothing at this address.'
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={notFound ? 'Page not found' : 'Something went wrong'}
        back={{ to: '/', label: 'Back to campaigns' }}
      />
      <main className="px-safe mx-auto w-full max-w-2xl space-y-4 py-10 text-center">
        <p className="text-stone-500">{message}</p>
        <div className="flex justify-center gap-2">
          <Link to="/" className="inline-flex min-h-11 items-center px-4 font-semibold underline">
            Go to campaigns
          </Link>
          {!notFound && (
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
