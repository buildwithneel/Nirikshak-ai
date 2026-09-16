import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.985] cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[38px] sm:min-h-[36px]',
    md: 'text-xs sm:text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-sm sm:text-base px-5 py-3 gap-2.5 min-h-[48px]',
  };

  const variantClasses = {
    primary:
      'bg-govgreen-900 hover:bg-govgreen-800 text-white border border-govgreen-950 shadow-subtle focus:ring-govgreen-700 active:bg-govgreen-950',
    secondary:
      'bg-institutional-subtle hover:bg-institutional-300 text-govink-primary border border-institutional-border focus:ring-govgreen-700',
    outline:
      'bg-white hover:bg-institutional-subtle text-govink-primary border border-institutional-border focus:ring-govgreen-700 shadow-subtle',
    teal:
      'bg-govteal-700 hover:bg-govteal-800 text-white border border-govteal-900 shadow-subtle focus:ring-govteal-600 active:bg-govteal-900',
    danger:
      'bg-govred-700 hover:bg-govred-800 text-white border border-govred-900 shadow-subtle focus:ring-govred-600',
    ghost:
      'bg-transparent hover:bg-institutional-subtle text-govink-secondary hover:text-govink-primary border-transparent focus:ring-institutional-border',
    success:
      'bg-govgreen-800 hover:bg-govgreen-900 text-white border border-govgreen-950 shadow-subtle focus:ring-govgreen-700',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
