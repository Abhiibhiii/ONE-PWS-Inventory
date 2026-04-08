import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
          <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
            The application encountered an unexpected error. We've logged the issue and are working on it.
          </p>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Button
              onClick={() => window.location.reload()}
              className="flex items-center"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Application
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
            >
              Go to Home
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 max-w-2xl overflow-auto rounded-lg bg-slate-100 p-4 text-left text-xs font-mono text-red-600 dark:bg-slate-900">
              {error?.toString()}
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}
