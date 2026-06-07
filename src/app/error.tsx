'use client';

import { useEffect } from 'react';

const AppRouteError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error('Etherana route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl rounded-3xl border border-light-200 bg-light-primary p-8 text-center shadow-sm dark:border-dark-200 dark:bg-dark-primary">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-black/60 dark:text-white/60">
          Etherana SX could not display this page. You can try again or open
          another section from the sidebar.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

export default AppRouteError;
