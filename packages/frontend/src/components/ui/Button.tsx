import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none shadow-soft',
          {
            'bg-primary-600 text-white hover:bg-primary-700': variant === 'default',
            'border border-gray-300 bg-transparent hover:bg-gray-100': variant === 'outline',
            'hover:bg-gray-100': variant === 'ghost',
            'px-3 py-1 text-sm min-h-touch': size === 'sm',
            'px-4 py-2 min-h-touch': size === 'md',
            'px-6 py-3 text-lg min-h-touch': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
