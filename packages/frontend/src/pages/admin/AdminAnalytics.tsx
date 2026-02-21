/**
 * Admin Analytics Page
 *
 * Real-time business metrics and insights dashboard
 */

import { MRRChart } from '../../components/charts/MRRChart';
import { ChurnRateCard } from '../../components/charts/ChurnRateCard';
import { UserActivityChart } from '../../components/charts/UserActivityChart';
import { ConversionFunnelChart } from '../../components/charts/ConversionFunnelChart';
import { UsageBreakdownChart } from '../../components/charts/UsageBreakdownChart';
import { UserGrowthChart } from '../../components/charts/UserGrowthChart';

export default function AdminAnalytics() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time business metrics and insights</p>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MRRChart />
        <ChurnRateCard />
        <UserActivityChart />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ConversionFunnelChart />
        <UsageBreakdownChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        <UserGrowthChart />
      </div>

      {/* Last Updated */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Dashboard auto-refreshes every minute
      </div>
    </div>
  );
}
