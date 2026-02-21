/**
 * User Table Column Definitions
 *
 * Defines columns for TanStack Table in AdminUsers page
 * Includes sortable, filterable columns for user management
 */

import { ColumnDef } from '@tanstack/react-table';
import { User } from '@gethiredpoc/shared';

/**
 * Helper function to format Unix timestamp to readable date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Role Badge Component
 */
function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`
        px-2 py-1 text-xs font-medium rounded-full
        ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}
      `}
    >
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  );
}

/**
 * Tier Badge Component
 */
function TierBadge({ tier }: { tier: string }) {
  const isPro = tier === 'pro';
  return (
    <span
      className={`
        px-2 py-1 text-xs font-semibold rounded-full
        ${isPro ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
      `}
    >
      {isPro ? 'PRO' : 'FREE'}
    </span>
  );
}

/**
 * User table column definitions
 */
export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: (info) => (
      <div className="text-sm">
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        {info.row.original.full_name && (
          <div className="text-gray-500">{info.row.original.full_name}</div>
        )}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: (info) => {
      const role = (info.getValue() as string) || 'user';
      return <RoleBadge role={role} />;
    },
    enableSorting: true,
    filterFn: 'equals',
  },
  {
    accessorKey: 'subscription_tier',
    header: 'Tier',
    cell: (info) => {
      const tier = (info.getValue() as string) || 'free';
      return <TierBadge tier={tier} />;
    },
    enableSorting: true,
    filterFn: 'equals',
  },
  {
    accessorKey: 'subscription_status',
    header: 'Status',
    cell: (info) => {
      const status = (info.getValue() as string) || 'active';
      const statusColors = {
        active: 'bg-green-100 text-green-800',
        canceled: 'bg-yellow-100 text-yellow-800',
        expired: 'bg-red-100 text-red-800',
      };
      const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
          {status}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: (info) => {
      const location = info.getValue() as string | null;
      return (
        <span className="text-sm text-gray-600">
          {location || '—'}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: (info) => (
      <span className="text-sm text-gray-600">
        {formatDate(info.getValue() as number)}
      </span>
    ),
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <button
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          onClick={() => {
            // TODO: Implement view user details
            console.log('View user:', row.original.id);
          }}
        >
          View
        </button>
        <button
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          onClick={() => {
            // TODO: Implement edit user
            console.log('Edit user:', row.original.id);
          }}
        >
          Edit
        </button>
      </div>
    ),
  },
];
