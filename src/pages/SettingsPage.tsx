import React, { useState } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { User, Bell, Shield, Globe, Sun, Moon, ShieldCheck, RefreshCw, ArrowRight, ChevronDown, ChevronUp, Cpu, Database, FileText, Users } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAssets } from '../hooks/useAssets';
import { useAuth } from '../hooks/useAuth';
import { AssetCategory, AssetSubcategory } from '../types';
import { cn } from '../utils/cn';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { ASSET_SCHEMA } from '../constants/assetSchema';
import { UserManagement } from '../components/Admin/UserManagement';

interface SettingsPageProps {
  initialSection?: 'bulk' | 'user-management';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialSection }) => {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings, bulkUpdateWarranty } = useAssets();
  const { user } = useAuth();
  const bulkRef = React.useRef<HTMLDivElement>(null);
  const userRef = React.useRef<HTMLDivElement>(null);
  
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin' || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'general' | 'users'>(initialSection === 'user-management' ? 'users' : 'general');

  React.useEffect(() => {
    if (initialSection === 'bulk' && bulkRef.current) {
      bulkRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (initialSection === 'user-management') {
      setActiveTab('users');
      if (userRef.current) {
        userRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [initialSection]);
  
  const [bulkCategory, setBulkCategory] = useState<AssetCategory>('Hardware');
  const [bulkSubcategory, setBulkSubcategory] = useState<string>('System');
  const [bulkDuration, setBulkDuration] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'hardware' | 'software' | 'gatepass' | null>('hardware');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const hardwareSubcategories = ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others'];
  const softwareSubcategories = ['Gmail', 'AutoCAD', 'Adobe Acrobat', 'Microsoft Office', 'SAP'];

  // Local state for warranty inputs to avoid immediate reset while typing
  const [localHardwareWarranty, setLocalHardwareWarranty] = useState<Record<string, string>>({});
  const [localSoftwareWarranty, setLocalSoftwareWarranty] = useState<Record<string, string>>({});
  const [localGatePassHeaders, setLocalGatePassHeaders] = useState<Record<string, string>>({});

  // Sync local state when settings load
  React.useEffect(() => {
    if (settings) {
      const hw: Record<string, string> = {};
      hardwareSubcategories.forEach(sub => {
        hw[sub] = (settings.hardwareWarranty?.[sub] ?? 0).toString();
      });
      setLocalHardwareWarranty(hw);

      const sw: Record<string, string> = {};
      softwareSubcategories.forEach(sub => {
        sw[sub] = (settings.softwareWarranty?.[sub] ?? 0).toString();
      });
      setLocalSoftwareWarranty(sw);

      if (settings.gatePassHeaders) {
        setLocalGatePassHeaders(settings.gatePassHeaders as Record<string, string>);
      }
    }
  }, [settings]);

  const handleBulkUpdate = () => {
    const duration = parseInt(bulkDuration);
    if (isNaN(duration)) {
      alert('Please enter a valid duration');
      return;
    }
    setIsBulkConfirmOpen(true);
  };

  const confirmBulkUpdate = async () => {
    const duration = parseInt(bulkDuration);
    setIsBulkUpdating(true);
    setSaveStatus(null);
    try {
      await bulkUpdateWarranty(bulkCategory, bulkSubcategory, duration);
      setBulkDuration('');
      setIsBulkConfirmOpen(false);
      setSaveStatus({ type: 'success', message: `Warranty updated successfully for all ${bulkCategory} → ${bulkSubcategory} assets.` });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Bulk update failed:', error);
      setSaveStatus({ type: 'error', message: 'Bulk update failed. Please try again.' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const updateWarrantyDuration = (category: AssetCategory, sub: string, value: string) => {
    if (category === 'Hardware') {
      setLocalHardwareWarranty(prev => ({ ...prev, [sub]: value }));
    } else {
      setLocalSoftwareWarranty(prev => ({ ...prev, [sub]: value }));
    }
  };

  const saveWarrantyDuration = async (category: AssetCategory, sub: string) => {
    if (!settings) return;
    
    const localValue = category === 'Hardware' ? localHardwareWarranty[sub] : localSoftwareWarranty[sub];
    if (localValue === undefined || localValue === '') return;

    const value = parseInt(localValue);
    if (isNaN(value)) return;

    // Only save if it's different from current setting
    const currentValue = category === 'Hardware' ? settings.hardwareWarranty?.[sub] : settings.softwareWarranty?.[sub];
    if (value === currentValue) return;

    try {
      if (category === 'Hardware') {
        await updateSettings({
          hardwareWarranty: {
            ...settings.hardwareWarranty,
            [sub]: value
          }
        });
      } else {
        await updateSettings({
          softwareWarranty: {
            ...settings.softwareWarranty,
            [sub]: value
          }
        });
      }
      setSaveStatus({ type: 'success', message: `Default warranty for ${sub} updated.` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: `Failed to save warranty for ${sub}.` });
    }
  };

  const saveGatePassHeader = async (key: string) => {
    if (!settings) return;
    const value = localGatePassHeaders[key];
    if (value === settings.gatePassHeaders?.[key]) return;

    try {
      await updateSettings({
        gatePassHeaders: {
          ...settings.gatePassHeaders,
          [key]: value
        }
      });
      setSaveStatus({ type: 'success', message: `Gate pass header label updated.` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: `Failed to save header label.` });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your account and application preferences.</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {saveStatus && (
          <div className={cn(
            "p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300",
            saveStatus.type === 'success' 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
          )}>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">{saveStatus.message}</span>
            </div>
            <button onClick={() => setSaveStatus(null)} className="text-sm font-bold opacity-50 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {isAdmin ? (
          <Card>
            <div className="flex items-center space-x-2 mb-6">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Warranty & License Management</h3>
            </div>
            
            <div className="space-y-6">
              {/* Dynamic Warranty Sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Global Default Durations</h4>
                  <p className="text-xs text-slate-400 italic">* Auto-applied to new assets</p>
                </div>

                {/* Hardware Section */}
                <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'hardware' ? null : 'hardware')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">Hardware Warranty Settings</span>
                    </div>
                    {expandedSection === 'hardware' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  
                  {expandedSection === 'hardware' && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-950">
                      {hardwareSubcategories.map(sub => (
                        <div key={sub} className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500">{sub}</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={localHardwareWarranty[sub] ?? ''}
                              onChange={(e) => updateWarrantyDuration('Hardware', sub, e.target.value)}
                              onBlur={() => saveWarrantyDuration('Hardware', sub)}
                              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Months</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Software Section */}
                <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'software' ? null : 'software')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">Software License Settings</span>
                    </div>
                    {expandedSection === 'software' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  
                  {expandedSection === 'software' && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-950">
                      {softwareSubcategories.map(sub => (
                        <div key={sub} className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500">{sub}</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={localSoftwareWarranty[sub] ?? ''}
                              onChange={(e) => updateWarrantyDuration('Software', sub, e.target.value)}
                              onBlur={() => saveWarrantyDuration('Software', sub)}
                              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Months</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate Pass Headers Section */}
                <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'gatepass' ? null : 'gatepass')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">Gate Pass Header Settings</span>
                    </div>
                    {expandedSection === 'gatepass' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  
                  {expandedSection === 'gatepass' && (
                    <div className="p-4 space-y-4 bg-white dark:bg-slate-950">
                      <p className="text-xs text-slate-500">Customize the labels for Gate Pass entry fields.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'gatePassNo', label: 'Gate Pass No.' },
                          { key: 'createDate', label: 'Create Date' },
                          { key: 'plantName', label: 'Plant Name' },
                          { key: 'transporter', label: 'Transporter' },
                          { key: 'receiverCode', label: 'Receiver Code' },
                          { key: 'reason', label: 'Reason' },
                          { key: 'receiverName', label: 'Receiver Name' },
                          { key: 'remark', label: 'Remark' },
                          { key: 'receiverAddress', label: 'Receiver Address' },
                          { key: 'vehicleNo', label: 'Vehicle No.' },
                          { key: 'gstNo', label: 'GST No.' },
                          { key: 'lrNo', label: 'LR No.' },
                          { key: 'requestedBy', label: 'Requested By' },
                          { key: 'deptName', label: 'Dept. Name' }
                        ].map(field => (
                          <div key={field.key} className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Default: {field.label}</label>
                            <input 
                              type="text"
                              value={localGatePassHeaders[field.key] ?? ''}
                              placeholder={field.label}
                              onChange={(e) => {
                                setLocalGatePassHeaders(prev => ({ ...prev, [field.key]: e.target.value }));
                              }}
                              onBlur={() => saveGatePassHeader(field.key)}
                              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Global Notification System */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Global Notification System</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Enable or disable the entire notification system for all users.
                    </p>
                  </div>
                  <button 
                    onClick={() => updateSettings({ notificationsEnabled: !(settings?.notificationsEnabled ?? true) })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      (settings?.notificationsEnabled ?? true) ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (settings?.notificationsEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Bulk Update */}
              <div className="space-y-4" ref={bulkRef}>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Bulk Warranty Update</h4>
                <p className="text-xs text-slate-500">
                  Force update the warranty duration for ALL existing assets in a specific category. This will overwrite any custom durations set on individual assets.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                    <select 
                      value={bulkCategory}
                      onChange={(e) => {
                        const cat = e.target.value as AssetCategory;
                        setBulkCategory(cat);
                        setBulkSubcategory(cat === 'Hardware' ? 'System' : 'Gmail');
                      }}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Subcategory</label>
                    <select 
                      value={bulkSubcategory}
                      onChange={(e) => setBulkSubcategory(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {(bulkCategory === 'Hardware' ? hardwareSubcategories : softwareSubcategories).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Input 
                      label="New Duration (Months)" 
                      type="number" 
                      placeholder="e.g. 36"
                      value={bulkDuration}
                      onChange={(e) => setBulkDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline"
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={handleBulkUpdate}
                    loading={isBulkUpdating}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isBulkUpdating && "animate-spin")} />
                    Apply Bulk Update
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Administrative Access Restricted</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              You are currently viewing the settings as a standard user. Administrative functions like warranty management and global defaults are hidden.
            </p>
          </Card>
        )}

        {isSuperAdmin && (
          <Card ref={userRef}>
            <div className="flex items-center space-x-2 mb-6">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">User Access Management</h3>
            </div>
            <UserManagement />
          </Card>
        )}

        <Card>
          <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Appearance</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'light' ? (
                <Sun className="h-5 w-5 text-slate-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-500" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Theme Mode</p>
                <p className="text-xs text-slate-500">Switch between light and dark mode</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Looking for Profile Settings?</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Personal information, notification preferences, and security settings have been moved to your dedicated Profile page.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-3 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/30 p-0 h-auto font-bold"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-profile'))}
              >
                Go to Profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={confirmBulkUpdate}
        title="Bulk Warranty Update"
        message={`Are you sure you want to update the warranty duration for ALL ${bulkCategory} - ${bulkSubcategory} to ${bulkDuration} months? This will overwrite individual settings for these assets.`}
        confirmText="Update All"
        isLoading={isBulkUpdating}
      />
    </div>
  );
};
