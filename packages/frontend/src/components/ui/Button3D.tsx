import { ReactNode, MouseEvent } from 'react';

interface Button3DProps {
  children: ReactNode;
  onClick?: (e?: MouseEvent<HTMLButtonElement>) => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export function Button3D({
  children,
  onClick,
  icon,
  variant = 'primary',
  disabled,
  className = ''
}: Button3DProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative group transition-transform hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className={`
        flex items-center gap-2 px-8 py-4 rounded-2xl font-bold
        shadow-3d-md group-hover:shadow-3d-lg group-active:shadow-3d-sm
        transition-all relative z-10
        ${variant === 'primary'
          ? 'bg-gradient-to-br from-violet to-teal text-white'
          : 'bg-white text-violet border-2 border-violet'
        }
      `}>
        {icon && <span className="text-xl animate-rocket-float">{icon}</span>}
        <span>{children}</span>
      </div>
    </button>
  );
}
