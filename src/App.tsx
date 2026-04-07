import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { AssetProvider } from './hooks/useAssets';
import { UserProvider } from './hooks/useUsers';
import { AuditLogProvider } from './hooks/useAuditLogs';
import { AlertProvider } from './hooks/useAlerts';
import { Logo } from './components/UI/Logo';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EWastePage } from './pages/EWastePage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { GatePassPage } from './pages/GatePassPage';
import { motion, AnimatePresence } from 'motion/react';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [initialSubTab, setInitialSubTab] = useState<string | null>(null);

  React.useEffect(() => {
    const handleNavigateToProfile = () => {
      setActiveTab('profile');
      setSelectedAssetId(null);
      setInitialSubTab(null);
    };
    const handleNavigateToBulkWarranty = () => {
      setActiveTab('settings');
      setSelectedAssetId(null);
      setInitialSubTab('bulk-warranty');
    };
    const handleNavigateToImportExport = () => {
      setActiveTab('assets');
      setSelectedAssetId(null);
      setInitialSubTab('import-export');
    };
    const handleNavigateToAlertHistory = () => {
      setActiveTab('alerts');
      setSelectedAssetId(null);
      setInitialSubTab('history');
    };

    const handleNavigateToUserManagement = () => {
      setActiveTab('settings');
      setSelectedAssetId(null);
      setInitialSubTab('user-management');
    };

    window.addEventListener('navigate-to-profile', handleNavigateToProfile);
    window.addEventListener('navigate-to-bulk-warranty', handleNavigateToBulkWarranty);
    window.addEventListener('navigate-to-import-export', handleNavigateToImportExport);
    window.addEventListener('navigate-to-alert-history', handleNavigateToAlertHistory);
    window.addEventListener('navigate-to-user-management', handleNavigateToUserManagement);

    return () => {
      window.removeEventListener('navigate-to-profile', handleNavigateToProfile);
      window.removeEventListener('navigate-to-bulk-warranty', handleNavigateToBulkWarranty);
      window.removeEventListener('navigate-to-import-export', handleNavigateToImportExport);
      window.removeEventListener('navigate-to-alert-history', handleNavigateToAlertHistory);
      window.removeEventListener('navigate-to-user-management', handleNavigateToUserManagement);
    };
  }, []);

  const renderContent = () => {
    if (selectedAssetId) {
      return <AssetDetailPage assetId={selectedAssetId} onBack={() => setSelectedAssetId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'assets': return <AssetsPage onAssetClick={(id) => setSelectedAssetId(id)} initialAction={initialSubTab === 'import-export' ? 'import' : undefined} />;
      case 'ewaste': return <EWastePage />;
      case 'gatepass': return <GatePassPage />;
      case 'alerts': return <AlertsPage initialTab={initialSubTab === 'history' ? 'history' : 'active'} />;
      case 'settings': return <SettingsPage initialSection={initialSubTab === 'bulk-warranty' ? 'bulk' : undefined} />;
      case 'profile': return <ProfilePage />;
      default: return <DashboardPage />;
    }
  };

  const getTitle = () => {
    if (selectedAssetId) return 'Asset Details';

    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'assets': return 'Asset Management';
      case 'gatepass': return 'Gate Pass Register';
      case 'ewaste': return 'Recycle Bin (E-Waste)';
      case 'alerts': return 'Smart Alerts';
      case 'settings': return 'Settings';
      case 'profile': return 'User Profile';
      default: return 'Dashboard';
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedAssetId(null);
  };

  return (
    <div className="min-h-screen transition-colors">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="pl-64">
        <Header title={getTitle()} />
        <main className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedAssetId ? `detail-${selectedAssetId}` : activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAuthReady } = useAuth();
  
  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-6">
          <Logo className="h-16 w-auto text-slate-900 dark:text-white animate-pulse" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Initializing ONE PWS...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <MainLayout /> : <LoginPage />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <AssetProvider>
            <AuditLogProvider>
              <AlertProvider>
                <Toaster position="top-right" richColors />
                <AppContent />
              </AlertProvider>
            </AuditLogProvider>
          </AssetProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
