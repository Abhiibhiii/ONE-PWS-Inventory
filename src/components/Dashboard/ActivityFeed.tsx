import React from 'react';
import { Card } from '../UI/Card';
import { useAssets } from '../../hooks/useAssets';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Plus, RefreshCw, Trash2, UserPlus, FileUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ActivityFeed: React.FC = () => {
  const { activities } = useAssets();

  const getIcon = (type: string) => {
    switch (type) {
      case 'Create': return <Plus className="h-4 w-4" />;
      case 'Update': return <RefreshCw className="h-4 w-4" />;
      case 'Delete': return <Trash2 className="h-4 w-4" />;
      case 'Assignment': return <UserPlus className="h-4 w-4" />;
      case 'Import': return <FileUp className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Create': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Update': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Delete': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'Assignment': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Import': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <Card className="h-full">
      <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
      <div className="space-y-6">
        {activities.slice(0, 6).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4">
            <div className={cn('mt-1 rounded-full p-2', getColor(activity.type))}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {activity.message}
              </p>
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                <span>{activity.user}</span>
                <span className="mx-2">•</span>
                <span>
                  {(() => {
                    try {
                      const pDate = parseISO(activity.timestamp);
                      return isNaN(pDate.getTime()) ? 'Recently' : formatDistanceToNow(pDate, { addSuffix: true });
                    } catch (e) {
                      return 'Recently';
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
