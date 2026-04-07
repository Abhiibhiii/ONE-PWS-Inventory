import React, { useState } from 'react';
import { Card } from '../components/UI/Card';
import { AlertPanel } from '../components/Alerts/AlertPanel';
import { useAlerts } from '../hooks/useAlerts';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/UI/Badge';
import { Button } from '../components/UI/Button';
import { format } from 'date-fns';
import { Search, Filter, History, Bell, FileDown, ClipboardList } from 'lucide-react';
import { cn } from '../utils/cn';

interface AlertsPageProps {
  initialTab?: 'active' | 'history' | 'audit';
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ initialTab = 'active' }) => {
  const { resolvedAlerts } = useAlerts();
  const { logs } = useAuditLogs();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'audit'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const isAdmin = user?.role === 'Admin';

  const filteredHistory = resolvedAlerts.filter(alert => {
    const query = (searchQuery || '').toLowerCase();
    return (alert.message || '').toLowerCase().includes(query) ||
           (alert.type || '').toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Smart Alerts</h2>
          <p className="text-slate-500 dark:text-slate-400">AI-driven monitoring and lifecycle recommendations.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === 'active' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            <Bell className="mr-2 h-4 w-4" /> Active
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === 'history' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            <History className="mr-2 h-4 w-4" /> History
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === 'audit' 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <ClipboardList className="mr-2 h-4 w-4" /> Audit Logs
            </button>
          )}
        </div>
      </div>

      {activeTab === 'active' ? (
        <Card className="max-w-4xl">
          <AlertPanel />
        </Card>
      ) : activeTab === 'history' ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search alert history..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Alert</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Resolved At</th>
                  <th className="px-4 py-3">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{alert.message}</div>
                      <div className="text-xs text-slate-500">{alert.suggestion}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{alert.type}</td>
                    <td className="px-4 py-3">
                      <Badge status={alert.severity} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {alert.resolvedAt ? format(alert.resolvedAt.toDate(), 'MMM dd, yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                        {alert.actionTaken || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No resolved alerts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => {
              const headers = ['Timestamp', 'Action', 'Description', 'Performed By', 'Alert ID'];
              const csvContent = [
                headers.join(','),
                ...logs.map(log => [
                  log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
                  log.actionType,
                  `"${log.description.replace(/"/g, '""')}"`,
                  log.performedBy,
                  log.alertId
                ].join(','))
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <FileDown className="mr-2 h-4 w-4" /> Export Audit Logs
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.filter(log => {
                  const query = (searchQuery || '').toLowerCase();
                  return (log.description || '').toLowerCase().includes(query) ||
                         (log.actionType || '').toLowerCase().includes(query);
                }).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm:ss') : 'Just now'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded px-2 py-1 text-[10px] font-bold uppercase",
                        log.actionType === 'CREATED' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        log.actionType === 'RESOLVED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        log.actionType === 'ACTION_TAKEN' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                      )}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{log.description}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
};
