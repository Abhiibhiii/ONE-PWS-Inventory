import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Bell, 
  Activity, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Camera,
  LogOut,
  Clock,
  AlertCircle,
  Settings,
  History,
  ArrowRight,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';

import { useAssets } from '../hooks/useAssets';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { settings } = useAssets();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateProfile({ avatar: base64String });
        setAvatar(base64String);
        toast.success('Avatar updated');
      } catch (error) {
        toast.error('Failed to update avatar');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name, avatar });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = async (path: string) => {
    if (!user.preferences) return;
    
    const newPreferences = { ...user.preferences };
    const parts = path.split('.');
    
    if (parts.length === 1) {
      (newPreferences as any)[parts[0]] = !(newPreferences as any)[parts[0]];
    } else if (parts.length === 2) {
      (newPreferences as any)[parts[0]] = {
        ...(newPreferences as any)[parts[0]],
        [parts[1]]: !(newPreferences as any)[parts[0]][parts[1]]
      };
    }

    try {
      await updateProfile({ preferences: newPreferences });
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  const permissions = [
    { label: 'View Dashboard', adminOnly: false },
    { label: 'View Assets', adminOnly: false },
    { label: 'Edit Assets', adminOnly: true },
    { label: 'Delete Assets', adminOnly: true },
    { label: 'Resolve Alerts', adminOnly: true },
    { label: 'Export Audit Logs', adminOnly: true },
    { label: 'Bulk Actions', adminOnly: true },
    { label: 'Manage Settings', adminOnly: true },
  ];

  const isSuperAdmin = user.role === 'Super Admin';
  const isAdmin = user.role === 'Admin' || isSuperAdmin;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <div className="relative h-48 rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute -bottom-12 left-8 flex items-end space-x-6">
          <div className="relative group">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="h-32 w-32 rounded-full border-4 border-white dark:border-slate-900 shadow-xl object-cover bg-white aspect-square"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-8 w-8 text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <div className="mb-14">
            <h1 className="text-3xl font-bold text-white">{user.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isAdmin ? 'bg-amber-400 text-amber-900' : 'bg-indigo-400 text-indigo-900'
              }`}>
                {user.role}
              </span>
              <span className="text-indigo-100 text-sm flex items-center">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
        {/* Left Column: Info & Security */}
        <div className="space-y-8 lg:col-span-2">
          {/* Profile Info */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h2>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} loading={isSaving}>
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input 
                  label="Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={!isEditing}
                />
                <Input 
                  label="Email Address" 
                  value={user.email} 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-4">
                <Input 
                  label="Avatar URL" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)} 
                  disabled={!isEditing}
                  placeholder="https://..."
                />
                <div className="pt-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">User Role</label>
                  <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 text-sm text-slate-500">
                    <Shield className="h-4 w-4 mr-2" />
                    {user.role} (Managed by Administrator)
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notification Preferences */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
              </div>
              {settings && !settings.notificationsEnabled && (
                <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase border border-amber-100">
                  Globally Disabled
                </span>
              )}
            </div>

            <div className={`space-y-6 ${settings && !settings.notificationsEnabled ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Channels</h3>
                  <div className="space-y-3">
                    <PreferenceToggle 
                      label="Email Notifications" 
                      description="Receive alerts via your registered email"
                      enabled={user.preferences?.emailNotifications || false}
                      onToggle={() => togglePreference('emailNotifications')}
                    />
                    <PreferenceToggle 
                      label="In-App Notifications" 
                      description="Show notification bell alerts"
                      enabled={user.preferences?.inAppNotifications || false}
                      onToggle={() => togglePreference('inAppNotifications')}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Alert Types</h3>
                  <div className="space-y-3">
                    <PreferenceToggle 
                      label="High Priority Only" 
                      enabled={user.preferences?.alertTypes?.high || false}
                      onToggle={() => togglePreference('alertTypes.high')}
                    />
                    <PreferenceToggle 
                      label="Warranty Expirations" 
                      enabled={user.preferences?.alertTypes?.warranty || false}
                      onToggle={() => togglePreference('alertTypes.warranty')}
                    />
                    <PreferenceToggle 
                      label="System Alerts" 
                      enabled={user.preferences?.alertTypes?.system || false}
                      onToggle={() => togglePreference('alertTypes.system')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Activity Summary */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activity Summary</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard 
                icon={AlertCircle} 
                label="Alerts Handled" 
                value={user.stats?.alertsHandled || 0} 
                color="text-amber-600 bg-amber-50 dark:bg-amber-900/20"
              />
              <StatCard 
                icon={CheckCircle2} 
                label="Actions Performed" 
                value={user.stats?.actionsPerformed || 0} 
                color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
              />
              <StatCard 
                icon={Clock} 
                label="Last Login" 
                value={safeFormat(user.stats?.lastLogin, 'MMM d, p', 'Never')} 
                color="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                isSmall
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Permissions & Shortcuts */}
        <div className="space-y-8">
          {/* Permissions View */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Permissions</h2>
            </div>
            <div className="space-y-3">
              {permissions.map((perm, i) => {
                const hasAccess = !perm.adminOnly || isAdmin;
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className={`text-sm ${hasAccess ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                      {perm.label}
                    </span>
                    {hasAccess ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-300" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 italic">
              * Permissions are assigned based on your role as an {user.role}.
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <ExternalLink className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Links</h2>
            </div>
            <div className="space-y-2">
              {isAdmin && (
                <>
                  {isSuperAdmin && (
                    <ShortcutLink 
                      icon={Users} 
                      label="Manage User Access" 
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-user-management'))}
                    />
                  )}
                  <ShortcutLink 
                    icon={Settings} 
                    label="Bulk Warranty Update" 
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-bulk-warranty'))}
                  />
                  <ShortcutLink 
                    icon={ArrowRight} 
                    label="Import/Export Assets" 
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-import-export'))}
                  />
                </>
              )}
              <ShortcutLink 
                icon={History} 
                label="Alert History" 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-alert-history'))}
              />
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6 border-red-100 dark:border-red-900/30">
            <h2 className="text-lg font-bold text-red-600 mb-4">Security</h2>
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out of Account
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PreferenceToggle: React.FC<{ 
  label: string; 
  description?: string; 
  enabled: boolean; 
  onToggle: () => void;
}> = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
    <button 
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

const StatCard: React.FC<{ 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string;
  isSmall?: boolean;
}> = ({ icon: Icon, label, value, color, isSmall }) => (
  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
    <p className={`font-bold text-slate-900 dark:text-white ${isSmall ? 'text-sm' : 'text-xl'}`}>{value}</p>
  </div>
);

const ShortcutLink: React.FC<{ icon: any; label: string; onClick?: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300 group text-left"
  >
    <div className="flex items-center">
      <Icon className="h-4 w-4 mr-3 text-slate-400 group-hover:text-indigo-600" />
      {label}
    </div>
    <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
  </button>
);
