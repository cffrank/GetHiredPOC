/**
 * Subscription Table Column Definitions
 *
 * Defines columns for TanStack Table in AdminSubscriptions page
 * Includes user subscription details, usage, and management actions
 */

import { ColumnDef } from '@tanstack/react-table';
import { User } from '@gethiredpoc/shared';

/**
 * Helper function to format Unix timestamp to readable date
 */
function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
 * Status Badge Component
 */
function StatusBadge({ status }: { status: string }) {
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
}

/**
 * Subscription table column definitions
 */
export const subscriptionColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'email',
    header: 'User',
    cell: (info) => (
      <div className="text-sm">
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        {info.row.original.full_name && (
          <div className="text-gray-500 text-xs">{info.row.original.full_name}</div>
        )}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: true,
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
      return <StatusBadge status={status} />;
    },
    enableSorting: true,
    filterFn: 'equals',
  },
  {
    accessorKey: 'subscription_started_at',
    header: 'Started',
    cell: (info) => (
      <span className="text-sm text-gray-600">
        {formatDate(info.getValue() as number)}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'subscription_expires_at',
    header: 'Expires',
    cell: (info) => {
      const expiresAt = info.getValue() as number | null | undefined;
      const tier = info.row.original.subscription_tier;

      if (tier === 'pro' && expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60));
        const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

        return (
          <div className="text-sm">
            <div className={isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'}>
              {formatDate(expiresAt)}
            </div>
            {isExpiringSoon && (
              <div className="text-xs text-orange-500">{daysRemaining}d remaining</div>
            )}
          </div>
        );
      }

      return <span className="text-sm text-gray-400">—</span>;
    },
    enableSorting: true,
  },
  {
    id: 'usage',
    header: 'Usage This Month',
    cell: ({ row }) => {
      // This would need actual usage data from API
      // For now, placeholder
      return (
        <div className="text-xs text-gray-500">
          <div>Jobs: —</div>
          <div>Apps: —</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const tier = row.original.subscription_tier || 'free';
      const status = row.original.subscription_status || 'active';

      return (
        <div className="flex items-center space-x-2">
          {tier === 'free' && (
            <button
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-300 rounded"
              onClick={() => {
                // TODO: Implement manual upgrade
                console.log('Upgrade user:', row.original.id);
              }}
            >
              Upgrade
            </button>
          )}
          {tier === 'pro' && status === 'active' && (
            <button
              className="text-xs text-orange-600 hover:text-orange-800 font-medium px-2 py-1 border border-orange-300 rounded"
              onClick={() => {
                // TODO: Implement cancel subscription
                console.log('Cancel subscription:', row.original.id);
              }}
            >
              Cancel
            </button>
          )}
          {tier === 'pro' && (
            <button
              className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 border border-gray-300 rounded"
              onClick={() => {
                // TODO: Implement view subscription details
                console.log('View subscription:', row.original.id);
              }}
            >
              Details
            </button>
          )}
        </div>
      );
    },
  },
];
