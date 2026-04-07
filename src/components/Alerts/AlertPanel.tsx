import React, { useState } from 'react';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { AlertCircle, ShieldAlert, Info, Sparkles, ChevronRight, CheckCircle, Trash2 } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { TakeActionModal } from './TakeActionModal';
import { ConfirmModal } from '../UI/ConfirmModal';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const AlertPanel: React.FC = () => {
  const { alerts, resolveAlert, loading } = useAlerts();
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [alertToResolve, setAlertToResolve] = useState<any>(null);

  const isAdmin = user?.role === 'Admin';

  const getIcon = (type: string) => {
    switch (type) {
      case 'Warranty': return <ShieldAlert className="h-5 w-5" />;
      case 'Unassigned': return <AlertCircle className="h-5 w-5" />;
      case 'Maintenance': return <Info className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'border-red-500/20 bg-red-50/50 dark:bg-red-900/10';
      case 'Medium': return 'border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10';
      case 'Low': return 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  const getTextColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-red-600 dark:text-red-400';
      case 'Medium': return 'text-amber-600 dark:text-amber-400';
      case 'Low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-slate-600';
    }
  };

  const handleResolve = async () => {
    if (alertToResolve) {
      await resolveAlert(alertToResolve.id);
      toast.success('Alert marked as resolved');
      setAlertToResolve(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI-Powered Insights</h3>
        </div>
        <Button variant="ghost" size="sm">View All</Button>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 dark:border-slate-800">
            <CheckCircle className="h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">All systems clear! No active alerts.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={cn('border p-4 transition-all hover:shadow-md', getColor(alert.severity))}>
              <div className="flex items-start space-x-4">
                <div className={cn('mt-1 rounded-full p-2', getTextColor(alert.severity))}>
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{alert.message}</h4>
                    <Badge status={alert.severity} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{alert.suggestion}</p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex space-x-2">
                      {isAdmin ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            Take Action <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            onClick={() => setAlertToResolve(alert)}
                          >
                            Mark as Resolved
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">View only access</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      {alert.createdAt ? format(alert.createdAt.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <TakeActionModal 
        alert={selectedAlert} 
        onClose={() => setSelectedAlert(null)} 
      />

      <ConfirmModal
        isOpen={!!alertToResolve}
        onClose={() => setAlertToResolve(null)}
        onConfirm={handleResolve}
        title="Mark as Resolved?"
        message="Are you sure you want to mark this alert as resolved? It will be moved to the alert history."
        confirmText="Resolve"
        type="warning"
      />
    </div>
  );
};
