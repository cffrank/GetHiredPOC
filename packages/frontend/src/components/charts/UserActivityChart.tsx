/**
 * User Activity Chart Component
 *
 * Displays DAU, WAU, MAU metrics
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export function UserActivityChart() {
  const { data, isLoading, error } = useQuery<{
    dau: number;
    wau: number;
    mau: number;
  }>({
    queryKey: ['analytics', 'activity'],
    queryFn: () => apiClient.request('/api/admin/analytics/activity'),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">User Activity</h3>
        <p className="text-red-600">Failed to load activity data</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">User Activity</h3>

      <div className="space-y-4">
        {/* DAU */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-blue-900">Daily Active Users</div>
            <div className="text-xs text-blue-700">Last 24 hours</div>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {data?.dau.toLocaleString() || '0'}
          </div>
        </div>

        {/* WAU */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-purple-900">Weekly Active Users</div>
            <div className="text-xs text-purple-700">Last 7 days</div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {data?.wau.toLocaleString() || '0'}
          </div>
        </div>

        {/* MAU */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-green-900">Monthly Active Users</div>
            <div className="text-xs text-green-700">Last 30 days</div>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {data?.mau.toLocaleString() || '0'}
          </div>
        </div>
      </div>

      {/* Engagement Rate */}
      {data && data.mau > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Daily Engagement Rate:{' '}
            <span className="font-semibold text-gray-900">
              {((data.dau / data.mau) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
