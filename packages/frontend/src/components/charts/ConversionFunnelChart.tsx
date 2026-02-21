/**
 * Conversion Funnel Chart Component
 *
 * Displays FREE → PRO conversion data over time
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../lib/api-client';

export function ConversionFunnelChart() {
  const { data, isLoading, error } = useQuery<Array<{ month: string; upgrades: number }>>({
    queryKey: ['analytics', 'conversions'],
    queryFn: () => apiClient.request('/api/admin/analytics/conversions?months=12'),
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
        <h3 className="text-lg font-semibold mb-4 text-gray-900">FREE → PRO Conversions</h3>
        <p className="text-red-600">Failed to load conversion data</p>
      </div>
    );
  }

  // Reverse data to show oldest first
  const chartData = [...(data || [])].reverse();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">FREE → PRO Conversions</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
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
            itemStyle={{ color: '#3b82f6' }}
          />
          <Bar dataKey="upgrades" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm text-gray-600">
        Total Upgrades: <span className="font-semibold text-gray-900">
          {data?.reduce((sum, item) => sum + item.upgrades, 0) || 0}
        </span>
      </div>
    </div>
  );
}
