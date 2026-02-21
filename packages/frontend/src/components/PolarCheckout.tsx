/**
 * PolarCheckout Component
 *
 * Handles PRO subscription checkout via Polar.sh
 * Creates a checkout session and redirects user to Polar payment page
 */

import { useState } from 'react';
import { apiClient } from '../lib/api-client';

interface PolarCheckoutProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PolarCheckout({ onSuccess, onError }: PolarCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call backend to create Polar checkout session
      const response = await apiClient.request('/api/subscription/upgrade', {
        method: 'POST',
      });

      if (!response.checkout_url) {
        throw new Error('No checkout URL returned from server');
      }

      // Redirect to Polar checkout page
      window.location.href = response.checkout_url;

      // Optional: Call onSuccess callback before redirect
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create checkout session';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`
          w-full px-6 py-3
          bg-blue-600 text-white font-semibold rounded-lg
          hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating checkout session...
          </span>
        ) : (
          'Upgrade to PRO - $39/month'
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>Secure payment processing by Polar.sh</p>
        <p className="mt-1">Cancel anytime • 30-day money-back guarantee</p>
      </div>
    </div>
  );
}
