import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred while loading this view.';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] flex items-center justify-center p-4 font-['Onest',system-ui,sans-serif]">
      <div className="max-w-md w-full bg-white dark:bg-[#09090B] rounded-3xl p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-3 py-1 rounded-full">
            Error {errorStatus}
          </span>
          <h1 className="text-2xl font-bold text-[#0A1931] dark:text-white">Something went wrong</h1>
          <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase tracking-wider shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200/80 text-[#0A1931] dark:text-white text-xs font-semibold uppercase tracking-wider border border-slate-200/60 transition-all cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>

        {import.meta.env.DEV && error instanceof Error && error.stack && (
          <details className="text-left bg-slate-50 dark:bg-[#121215] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300">
            <summary className="cursor-pointer font-semibold text-slate-600 select-none">
              Developer Stack Trace
            </summary>
            <pre className="mt-2 text-[10px] overflow-x-auto p-2 bg-slate-100 dark:bg-zinc-900 rounded text-slate-800 dark:text-zinc-200 font-mono">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};
