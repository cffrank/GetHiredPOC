/**
 * Churn Rate Card Component
 *
 * Displays subscription churn metrics
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export function ChurnRateCard() {
  const { data, isLoading, error } = useQuery<{
    totalPro: number;
    canceled: number;
    churnRate: number;
  }>({
    queryKey: ['analytics', 'churn'],
    queryFn: () => apiClient.request('/api/admin/analytics/churn'),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Churn Rate</h3>
        <p className="text-red-600">Failed to load churn data</p>
      </div>
    );
  }

  const churnRate = data?.churnRate || 0;
  const isHealthy = churnRate < 5; // < 5% is healthy
  const isWarning = churnRate >= 5 && churnRate < 10;
  const isDanger = churnRate >= 10;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Churn Rate</h3>
      <div
        className={`text-4xl font-bold mb-2 ${
          isHealthy ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-red-600'
        }`}
      >
        {churnRate.toFixed(1)}%
      </div>
      <div className="text-sm text-gray-600 mb-4">
        {data?.canceled || 0} of {data?.totalPro || 0} PRO users canceled
      </div>

      {/* Status indicator */}
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          isHealthy
            ? 'bg-green-100 text-green-800'
            : isWarning
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {isHealthy && '✓ Healthy'}
        {isWarning && '⚠ Monitor'}
        {isDanger && '⚠ High Churn'}
      </div>

      {/* Breakdown */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Active PRO</span>
          <span className="font-semibold text-gray-900">
            {(data?.totalPro || 0) - (data?.canceled || 0)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Canceled</span>
          <span className="font-semibold text-red-600">{data?.canceled || 0}</span>
        </div>
      </div>
    </div>
  );
}
