/**
 * Usage Breakdown Chart Component
 *
 * Displays usage statistics by action type
 */

import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { apiClient } from '../../lib/api-client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ACTION_TYPE_LABELS: Record<string, string> = {
  job_import: 'Job Searches',
  jobs_imported: 'Jobs Imported',
  application: 'Applications',
  resume: 'Resumes',
  cover_letter: 'Cover Letters',
};

export function UsageBreakdownChart() {
  const { data, isLoading, error } = useQuery<Array<{ type: string; count: number }>>({
    queryKey: ['analytics', 'usage-breakdown'],
    queryFn: () => apiClient.request('/api/admin/analytics/usage-breakdown?days=30'),
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
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Usage Breakdown</h3>
        <p className="text-red-600">Failed to load usage data</p>
      </div>
    );
  }

  // Format data for pie chart
  const chartData = (data || []).map((item) => ({
    name: ACTION_TYPE_LABELS[item.type] || item.type,
    value: item.count,
  }));

  const totalUsage = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Usage Breakdown (Last 30 Days)</h3>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No usage data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${((entry.value / totalUsage) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Total Usage */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600">
              Total Actions: <span className="font-semibold text-gray-900">{totalUsage.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
