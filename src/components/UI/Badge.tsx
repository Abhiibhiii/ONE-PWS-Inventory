import React from 'react';
import { cn } from '../../utils/cn';
import { AssetStatus } from '../../types';

interface BadgeProps {
  status: AssetStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const variants: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'E-Waste': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'In Repair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Replaced: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Move to E-Waste': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    Systems: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    Printers: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Laptops: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Software: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    EXPIRING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    NO_DATA: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    'In Warranty': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Expiring': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Expired': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'No Data': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[status] || 'bg-slate-100 text-slate-700',
        className
      )}
    >
      {status}
    </span>
  );
};
