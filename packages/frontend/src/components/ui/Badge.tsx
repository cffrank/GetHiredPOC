import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'remote' | 'hot' | 'salary';
}

const badgeVariants = {
  default: 'bg-primary-100 text-primary-800',
  remote: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-3d-sm',
  hot: 'bg-gradient-to-br from-coral to-red-500 text-white shadow-3d-sm animate-badge-pulse',
  salary: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-3d-sm',
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
