import React from 'react';
import { ACL } from '../../types';
import { Shield, ShieldAlert, Key } from 'lucide-react';

interface AclBadgeProps {
  acl: ACL;
  size?: 'sm' | 'md';
  className?: string;
}

export const AclBadge: React.FC<AclBadgeProps> = ({ acl, size = 'md', className = '' }) => {
  const getBadgeConfig = () => {
    switch (acl) {
      case 'leads_only':
        return {
          label: 'Leads Only',
          icon: ShieldAlert,
          classes:
            'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
        };
      case 'owner_only':
        return {
          label: 'Owner Only',
          icon: Key,
          classes:
            'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700',
        };
      case 'team':
      default:
        return {
          label: 'Team Access',
          icon: Shield,
          classes:
            'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        };
    }
  };

  const { label, icon: Icon, classes } = getBadgeConfig();
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center space-x-1 font-medium rounded border ${sizeClasses} ${classes} ${className}`}
      title={`Access Control: ${label}`}
    >
      <Icon size={12} className="flex-shrink-0" />
      <span>{label}</span>
    </span>
  );
};
