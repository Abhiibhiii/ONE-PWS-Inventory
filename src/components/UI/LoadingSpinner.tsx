import React from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = false, 
  message = "Loading data..." 
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo className="h-8 w-8 text-indigo-600 dark:text-indigo-500" />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        {message}
      </motion.p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950">
        {content}
      </div>
    );
  }

  return (
    <div className="flex h-64 w-full items-center justify-center">
      {content}
    </div>
  );
};
