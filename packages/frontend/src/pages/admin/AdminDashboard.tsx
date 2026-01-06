import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

interface SystemMetrics {
  total_users: number;
  admin_users: number;
  trial_users: number;
  paid_users: number;
  total_jobs: number;
  total_applications: number;
  total_saved_jobs: number;
  ai_requests_today: number;
  ai_requests_week: number;
  ai_requests_month: number;
  database_size_mb?: number;
  active_sessions?: number;
}

export default function AdminDashboard() {
  const { data: metrics, isLoading, error } = useQuery<SystemMetrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.fetch('/api/admin/metrics');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error Loading Metrics</h3>
        <p className="text-red-600 text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const MetricCard = ({ title, value, subtitle, color = 'blue' }: {
    title: string;
    value: number | string;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      red: 'bg-red-50 border-red-200 text-red-700',
    };

    return (
      <div className={`${colorClasses[color]} border rounded-lg p-6 shadow-sm`}>
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
        {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System metrics and analytics overview</p>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics?.total_users || 0}
            color="blue"
          />
          <MetricCard
            title="Admin Users"
            value={metrics?.admin_users || 0}
            color="purple"
          />
          <MetricCard
            title="Trial Users"
            value={metrics?.trial_users || 0}
            subtitle="Free trial period"
            color="orange"
          />
          <MetricCard
            title="Paid Users"
            value={metrics?.paid_users || 0}
            subtitle="Active subscriptions"
            color="green"
          />
        </div>
      </div>

      {/* Job & Application Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Job & Application Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total Jobs"
            value={metrics?.total_jobs || 0}
            subtitle="In database"
            color="blue"
          />
          <MetricCard
            title="Total Applications"
            value={metrics?.total_applications || 0}
            subtitle="Submitted by users"
            color="green"
          />
          <MetricCard
            title="Total Saved Jobs"
            value={metrics?.total_saved_jobs || 0}
            subtitle="Bookmarked by users"
            color="purple"
          />
        </div>
      </div>

      {/* AI Usage Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Usage Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="AI Requests Today"
            value={metrics?.ai_requests_today || 0}
            color="blue"
          />
          <MetricCard
            title="AI Requests This Week"
            value={metrics?.ai_requests_week || 0}
            color="green"
          />
          <MetricCard
            title="AI Requests This Month"
            value={metrics?.ai_requests_month || 0}
            color="purple"
          />
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics?.database_size_mb && (
            <MetricCard
              title="Database Size"
              value={`${metrics.database_size_mb.toFixed(2)} MB`}
              color="blue"
            />
          )}
          {metrics?.active_sessions && (
            <MetricCard
              title="Active Sessions"
              value={metrics.active_sessions}
              subtitle="Currently logged in"
              color="green"
            />
          )}
        </div>
      </div>
    </div>
  );
}
