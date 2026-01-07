/**
 * AdminUsers Page - Refactored to use TanStack Table
 *
 * User management interface with advanced sorting, filtering, and pagination
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type { User } from '@gethiredpoc/shared';
import UsersTable from '../../components/tables/UsersTable';
import { userColumns } from '../../components/tables/columns/userColumns';

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();

  // Fetch all users (TanStack Table handles pagination client-side)
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users'],
    queryFn: () => {
      // Fetch all users at once for client-side table
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Fetch up to 1000 users for client-side filtering
      });
      return apiClient.request(`/api/admin/users?${params}`);
    },
  });

  // Mutation for updating user role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      apiClient.request(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
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
          <h3 className="text-red-800 font-semibold">Error Loading Users</h3>
          <p className="text-red-600 text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage user accounts, roles, and subscription tiers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {data?.users?.length || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">FREE Tier</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {data?.users?.filter((u) => (u.subscription_tier || 'free') === 'free').length || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">PRO Tier</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {data?.users?.filter((u) => u.subscription_tier === 'pro').length || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Admins</div>
          <div className="text-2xl font-bold text-purple-600 mt-2">
            {data?.users?.filter((u) => u.role === 'admin').length || 0}
          </div>
        </div>
      </div>

      {/* Users Table with TanStack Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Users</h2>
        <UsersTable data={data?.users || []} columns={userColumns} />
      </div>
    </div>
  );
}
