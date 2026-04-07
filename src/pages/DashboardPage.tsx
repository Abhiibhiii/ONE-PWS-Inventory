import React from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAlerts } from '../hooks/useAlerts';
import { KPI } from '../components/Dashboard/KPI';
import { Charts } from '../components/Dashboard/Charts';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import { AlertPanel } from '../components/Alerts/AlertPanel';
import { Package, CheckCircle, AlertTriangle, Clock, ArrowRight, Activity, Trash2, Bell, Plus, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { cn } from '../utils/cn';
import { isAfter, subDays } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { stats, getFinancialYearStats, gatePasses, isLoading } = useAssets();
  const { resolvedAlerts, loading: alertsLoading } = useAlerts();
  const [activeTab, setActiveTab] = React.useState<'hardware' | 'software'>('hardware');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultFY = currentMonth < 3 ? currentYear - 1 : currentYear;
  const [selectedFY, setSelectedFY] = React.useState(defaultFY);

  const fyStats = getFinancialYearStats(selectedFY);

  const financialYears = React.useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(defaultFY - i);
    }
    return years;
  }, [defaultFY]);

  if (isLoading || alertsLoading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h2>
          <p className="text-slate-500 dark:text-slate-400">Welcome back! Here's what's happening with your assets today.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('hardware')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === 'hardware' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Hardware
          </button>
          <button
            onClick={() => setActiveTab('software')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === 'software' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Software
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'hardware' ? (
          <motion.div
            key="hardware"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
              <KPI title={`Total Hardware (${stats.hardware.total})`} value={stats.hardware.total} icon={Package} color="indigo" />
              <KPI title={`Active (${stats.hardware.active})`} value={stats.hardware.active} icon={CheckCircle} color="emerald" />
              <KPI title={`In IT Stock (${stats.hardware.itStock})`} value={stats.hardware.itStock} icon={Package} color="violet" />
              <KPI title={`In Repair (${stats.hardware.inRepair})`} value={stats.hardware.inRepair} icon={Activity} color="amber" />
              <KPI title={`Replaced (${stats.hardware.replaced})`} value={stats.hardware.replaced} icon={Package} color="blue" />
              <KPI title={`E-Waste (${stats.hardware.ewaste})`} value={stats.hardware.ewaste} icon={Trash2} color="slate" />
              <KPI title={`Gate Passes (${gatePasses.length})`} value={gatePasses.length} icon={FileText} color="indigo" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <KPI title={`In Warranty (${stats.warranty.active})`} value={stats.warranty.active} icon={CheckCircle} color="emerald" />
              <KPI title={`Expiring (${stats.warranty.expiring})`} value={stats.warranty.expiring} icon={Clock} color="amber" />
              <KPI title={`Expired (${stats.warranty.expired})`} value={stats.warranty.expired} icon={AlertTriangle} color="red" />
              <KPI title={`No Data (${stats.warranty.noData})`} value={stats.warranty.noData} icon={AlertTriangle} color="slate" />
            </div>

            {/* Financial Year Analytics */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Financial Year Analytics</h3>
                  <p className="text-sm text-slate-500">Performance metrics for the selected financial year</p>
                </div>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(parseInt(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  {financialYears.map(year => (
                    <option key={year} value={year}>FY {year}-{String(year + 1).slice(2)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="flex items-center space-x-4 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/10">
                  <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Assets Added</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{fyStats.added}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/10">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Assets Repaired</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{fyStats.repaired}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
                  <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Moved to E-Waste</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{fyStats.ewaste}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="software"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <KPI title={`Total Software (${stats.software.total})`} value={stats.software.total} icon={Package} color="violet" />
              <KPI title={`Active (${stats.software.active})`} value={stats.software.active} icon={CheckCircle} color="emerald" />
              <KPI title={`Inactive (${stats.software.inactive})`} value={stats.software.inactive} icon={AlertTriangle} color="red" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Charts />
          <ActivityFeed />
        </div>
        <div className="space-y-8">
          <AlertPanel />
        </div>
      </div>
    </div>
  );
};
