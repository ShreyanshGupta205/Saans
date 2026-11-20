import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DegradedBannerProps {
  readonly message: string;
  readonly onRetry?: () => void;
  readonly isRetrying?: boolean;
}

export function DegradedBanner({ message, onRetry, isRetrying = false }: DegradedBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-950 border-y sm:border sm:rounded-lg border-amber-600/50 p-4 text-amber-200 mb-6 shadow-md"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold tracking-wide text-amber-300">
              Degraded / Offline Rule Mode Active
            </p>
            <p className="text-xs sm:text-sm text-amber-200/90 mt-0.5">{message}</p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-800 hover:bg-amber-700 text-amber-100 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50"
            aria-label="Retry live connection"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRetrying ? 'Retrying...' : 'Retry Live'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
