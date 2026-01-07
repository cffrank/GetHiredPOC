/**
 * User Growth Chart Component
 *
 * Displays new user signups over time
 */

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../lib/api-client';

export function UserGrowthChart() {
  const { data, isLoading, error } = useQuery<Array<{ month: string; newUsers: number }>>({
    queryKey: ['analytics', 'user-growth'],
    queryFn: () => apiClient.request('/api/admin/analytics/user-growth?months=12'),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">User Growth</h3>
        <p className="text-red-600">Failed to load user growth data</p>
      </div>
    );
  }

  const chartData = data || [];
  const totalNewUsers = chartData.reduce((sum, item) => sum + item.newUsers, 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">User Growth</h3>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No user growth data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 text-center text-sm text-gray-600">
            Total New Users (Last 12 Months): <span className="font-semibold text-gray-900">
              {totalNewUsers.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
