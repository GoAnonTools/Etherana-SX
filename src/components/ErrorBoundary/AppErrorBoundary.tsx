'use client';

import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Etherana section crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-light-200 bg-light-secondary/60 p-6 text-center dark:border-dark-200 dark:bg-dark-secondary/60">
          <h2 className="text-base font-semibold text-black dark:text-white">
            {this.props.title || 'This section could not be displayed'}
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-black/55 dark:text-white/55">
            {this.props.description ||
              'Something went wrong in this part of Etherana SX. The rest of the workspace is still available.'}
          </p>

          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:scale-[1.01] dark:bg-white dark:text-black"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
