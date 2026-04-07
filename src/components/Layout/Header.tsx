import React from 'react';
import { Search, Bell, HelpCircle, Sun, Moon } from 'lucide-react';
import { Button } from '../UI/Button';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets, serials..."
            className="h-10 w-64 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <Sun className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      </div>
    </header>
  );
};
