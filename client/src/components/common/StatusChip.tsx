import React from 'react';
import { ClaimStatus } from '../../types';
import {
  CheckCircle2,
  UserCheck,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Lock,
  XCircle,
} from 'lucide-react';

interface StatusChipProps {
  status: ClaimStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Verified':
        return {
          label: 'Verified',
          icon: CheckCircle2,
          classes:
            'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800',
        };
      case 'Attested':
        return {
          label: 'Attested',
          icon: UserCheck,
          classes:
            'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        };
      case 'Inferred':
        return {
          label: 'Inferred',
          icon: Lightbulb,
          classes:
            'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        };
      case 'Conflicting':
        return {
          label: 'Conflicting',
          icon: AlertTriangle,
          classes:
            'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800',
        };
      case 'Missing':
        return {
          label: 'Missing Gap',
          icon: HelpCircle,
          classes:
            'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        };
      case 'Restricted':
        return {
          label: 'Restricted',
          icon: Lock,
          classes:
            'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
      case 'Rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          classes:
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800',
        };
      default:
        return {
          label: status,
          icon: HelpCircle,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const { label, icon: Icon, classes } = getStatusConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 space-x-2 font-medium',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${classes} ${className}`}
      title={`Claim status: ${label}`}
    >
      {showIcon && <Icon size={iconSizes} className="flex-shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
