/**
 * AdminSubscriptions Page - Refactored to use TanStack Table
 *
 * Subscription management interface with filtering, sorting, and CSV export
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type { User } from '@gethiredpoc/shared';
import SubscriptionsTable from '../../components/tables/SubscriptionsTable';
import { subscriptionColumns } from '../../components/tables/columns/subscriptionColumns';

interface UsersResponse {
  users: User[];
  total: number;
}

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();

  // Fetch all users for subscription management
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Fetch all for client-side filtering
      });
      return apiClient.request(`/api/admin/users?${params}`);
    },
  });

  // Mutation for upgrading user to PRO (admin action)
  const upgradeUserMutation = useMutation({
    mutationFn: ({ userId, durationMonths }: { userId: string; durationMonths: number }) =>
      apiClient.request(`/api/admin/users/${userId}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ durationMonths }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
  });

  // Mutation for downgrading user to FREE (admin action)
  const downgradeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.request(`/api/admin/users/${userId}/downgrade`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Subscriptions</h3>
          <p className="text-red-600 text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Calculate subscription stats
  const users = data?.users || [];
  const totalUsers = users.length;
  const freeUsers = users.filter((u) => (u.subscription_tier || 'free') === 'free').length;
  const proUsers = users.filter((u) => u.subscription_tier === 'pro').length;
  const activeSubscriptions = users.filter(
    (u) => u.subscription_tier === 'pro' && u.subscription_status === 'active'
  ).length;
  const canceledSubscriptions = users.filter(
    (u) => u.subscription_tier === 'pro' && u.subscription_status === 'canceled'
  ).length;
  const monthlyRevenue = proUsers * 39; // $39/month per PRO user

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage user subscriptions and billing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalUsers}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">FREE Tier</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{freeUsers}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">PRO Tier</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{proUsers}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{activeSubscriptions}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Canceled</div>
          <div className="text-2xl font-bold text-yellow-600 mt-2">{canceledSubscriptions}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">MRR</div>
          <div className="text-2xl font-bold text-green-600 mt-2">${monthlyRevenue}</div>
          <div className="text-xs text-gray-500 mt-1">Monthly Revenue</div>
        </div>
      </div>

      {/* Subscriptions Table with TanStack Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Subscriptions</h2>
        <SubscriptionsTable data={users} columns={subscriptionColumns} />
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Subscription Tiers</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <strong>FREE:</strong> 3 searches/day, 25 jobs/search, 10 applications/month, 5 resumes/month, 10 cover
            letters/month
          </div>
          <div>
            <strong>PRO ($39/month):</strong> Unlimited searches, jobs, applications, resumes, and cover letters
          </div>
        </div>
      </div>
    </div>
  );
}
