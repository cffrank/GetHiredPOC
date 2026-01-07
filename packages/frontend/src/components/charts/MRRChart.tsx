/**
 * MRR Chart Component
 *
 * Displays Monthly Recurring Revenue with growth indicator
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export function MRRChart() {
  const { data, isLoading, error } = useQuery<{
    current: number;
    lastMonth: number;
    growth: number;
  }>({
    queryKey: ['analytics', 'mrr'],
    queryFn: () => apiClient.request('/api/admin/analytics/mrr'),
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
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Recurring Revenue</h3>
        <p className="text-red-600">Failed to load MRR data</p>
      </div>
    );
  }

  const isPositiveGrowth = (data?.growth || 0) >= 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Recurring Revenue</h3>
      <div className="text-4xl font-bold text-green-600 mb-2">
        ${data?.current.toLocaleString() || '0'}
      </div>
      <div className={`text-sm font-medium ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
        <span className="inline-flex items-center">
          {isPositiveGrowth ? (
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {Math.abs(data?.growth || 0).toFixed(1)}% from last month
        </span>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Last Month: <span className="font-semibold">${data?.lastMonth.toLocaleString() || '0'}</span>
        </div>
      </div>
    </div>
  );
}
