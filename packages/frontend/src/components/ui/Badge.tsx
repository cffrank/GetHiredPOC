import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export const Badge = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-800', className)}
      {...props}
    />
  )
);
