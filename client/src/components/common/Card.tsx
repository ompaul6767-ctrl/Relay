import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 dark:bg-navy-900 dark:border-slate-800 ${
        hoverable ? 'hover:shadow-md hover:border-teal-500/50 cursor-pointer transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
