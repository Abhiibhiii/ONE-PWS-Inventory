import React from 'react';
import { Card } from '../UI/Card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KPIProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'indigo' | 'emerald' | 'amber' | 'red';
}

export const KPI: React.FC<KPIProps> = ({ title, value, icon: Icon, trend, color }) => {
  const colorVariants = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-xl p-3', colorVariants[color])}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className={cn('flex items-center text-xs font-medium', trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
            {trend.isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</h3>
      </div>
    </Card>
  );
};
