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
    'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-teal-600 text-white shadow-sm shadow-teal-900/15 ring-1 ring-inset ring-white/15 hover:bg-teal-700 active:bg-teal-800 focus-visible:ring-teal-400/60',
    secondary:
      'glass-control text-slate-800 hover:text-slate-950 active:brightness-95 dark:text-slate-100 dark:hover:text-white',
    outline:
      'glass-control text-slate-700 hover:text-slate-950 focus-visible:ring-teal-400/60 dark:text-slate-200 dark:hover:text-white',
    danger:
      'bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
    ghost:
      'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-sm shadow-emerald-900/10',
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
