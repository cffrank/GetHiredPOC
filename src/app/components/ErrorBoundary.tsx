"use client";

import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  console.error('[ErrorBoundary]', error);
  return (
    <div className="p-6 rounded-lg border border-gray-200 text-center">
      <p className="text-gray-600 mb-4">
        Oops, something went wrong! Let&apos;s try that again.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export { ErrorBoundary };
