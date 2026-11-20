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
      className={`glass rounded-2xl p-5 ${
        hoverable ? 'glass-interactive cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
