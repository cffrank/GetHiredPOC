import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export const Badge = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800', className)}
      {...props}
    />
  )
);
