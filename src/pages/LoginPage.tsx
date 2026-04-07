import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Card } from '../components/UI/Card';
import { Logo } from '../components/UI/Logo';
import { Package, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-24 w-auto text-slate-900 dark:text-white" />
          <p className="mt-2 text-slate-500 dark:text-slate-400">Enterprise Asset Management System</p>
        </div>

        <Card className="p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="text-sm text-slate-500 mt-1">Sign in to access your organization's assets</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button 
              onClick={handleGoogleLogin} 
              className="w-full flex items-center justify-center space-x-3" 
              variant="outline"
              isLoading={isLoading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 dark:bg-slate-900">Secure Access</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-3 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-500">
                <Lock className="h-4 w-4 text-indigo-500" />
                <span>Role-based access control</span>
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Need help?{' '}
          <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Contact IT Support
          </a>
        </p>
      </motion.div>
    </div>
  );
};
