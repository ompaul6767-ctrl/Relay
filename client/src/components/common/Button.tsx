import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 focus:ring-teal-500 shadow-sm shadow-teal-900/10',
    secondary:
      'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 focus:ring-navy-600 dark:bg-navy-800 dark:hover:bg-navy-700',
    outline:
      'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-teal-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm shadow-rose-900/10',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm shadow-emerald-900/10',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
