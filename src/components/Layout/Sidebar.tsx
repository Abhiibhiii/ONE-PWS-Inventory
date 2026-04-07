import React from 'react';
import { LayoutDashboard, Package, Bell, Settings, LogOut, Moon, Sun, ChevronRight, Search, Plus, Filter, Download, Upload, MoreVertical, Trash2, Edit, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';
import { Button } from '../UI/Button';
import { Logo } from '../UI/Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Asset Management', icon: Package },
    { id: 'gatepass', label: 'Gate Pass', icon: FileText, roles: ['Admin', 'Super Admin'] },
    { id: 'ewaste', label: 'E-Waste', icon: Trash2, roles: ['Admin', 'Super Admin'] },
    { id: 'alerts', label: 'Smart Alerts', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin', 'Super Admin'] },
  ].filter(item => !item.roles || item.roles.includes(user?.role || ''));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-8 flex items-center px-2">
          <Logo className="h-12 w-auto text-slate-900 dark:text-white" />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <item.icon className={cn('mr-3 h-5 w-5', activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
              {item.label}
              {activeTab === item.id && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Appearance
            </span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>

          <div 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center rounded-xl p-3 cursor-pointer transition-all",
              activeTab === 'profile' 
                ? "bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800" 
                : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
            />
            <div className="ml-3 overflow-hidden">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.role}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }} 
              className="ml-auto h-8 w-8 text-slate-400 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
