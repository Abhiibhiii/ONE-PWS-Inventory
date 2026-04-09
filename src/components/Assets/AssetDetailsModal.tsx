import React, { useState } from 'react';
import { Asset, AssetStatus, GatePass } from '../../types';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { Card } from '../UI/Card';
import { Input } from '../UI/Input';
import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../hooks/useAuth';
import { Monitor, Keyboard, Mouse, Cpu, HardDrive, Layers, Shield, User, MapPin, Building, Calendar, Tag, Info, Activity, Clock, ShieldCheck, Plus, History, FileText, Download, Palette, Hash } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getRowColorClass } from '../../utils/assetUtils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateGatePassDoc } from '../../lib/gatePassGenerator';
import { GatePassForm } from '../GatePass/GatePassForm';

interface AssetDetailsModalProps {
  asset: Asset;
  onUpdateStatus: (id: string, status: AssetStatus, peripheralStatus?: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

const DetailItem: React.FC<{ icon: any, label: string, value: string | number | undefined }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
    <div className="mt-0.5">
      <Icon className="h-4 w-4 text-slate-400" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {(value === undefined || value === null || String(value).trim() === '') ? 'N/A' : value}
      </p>
    </div>
  </div>
);

const FIELD_ICONS: Record<string, any> = {
  name: Tag,
  sysSlNo: Hash,
  model: Monitor,
  invoiceDate: Calendar,
  invoiceNo: Hash,
  vendor: Building,
  warrantyDurationMonths: ShieldCheck,
  value: Tag,
  department: Building,
  location: MapPin,
  assignedTo: User,
  systemName: Monitor,
  processor: Cpu,
  ramMb: Cpu,
  hddGb: HardDrive,
  os: Monitor,
  licenseType: ShieldCheck,
  productKey: Hash,
  monitor: Monitor,
  monitorSn: Hash,
  keyboard: Monitor,
  mouse: Monitor,
  usbStatus: ShieldCheck,
  ipAddress: Activity,
  dynamicIp: Activity,
  remarks: Info,
};

export const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({ asset, onUpdateStatus, onClose }) => {
  const { getWarrantyStatus, settings, addGatePass, updateGatePass, vendors, updateAsset, getEffectiveSchema } = useAssets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';
  const [systemStatus, setSystemStatus] = useState<AssetStatus>(asset.status);
  const [rowColor, setRowColor] = useState<'White' | 'Red' | 'Violet' | 'Green'>(asset.rowColor || 'White');
  const [peripheralStatus, setPeripheralStatus] = useState<Record<string, string>>(asset.peripheralStatus || {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showGatePassForm, setShowGatePassForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'gate-pass'>('details');

  React.useEffect(() => {
    setSystemStatus(asset.status);
  }, [asset.status]);

  React.useEffect(() => {
    if (systemStatus === 'In Repair' && isAdmin) {
      setShowGatePassForm(true);
    }
  }, [systemStatus, isAdmin]);

  const effectiveSchema = getEffectiveSchema(asset.category, asset.subcategory);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(asset.id, systemStatus, peripheralStatus);
      if (rowColor !== asset.rowColor) {
        await updateAsset(asset.id, { rowColor });
      }
      onClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const statuses: AssetStatus[] = ['Active', 'In Repair', 'Replaced', 'Move to E-Waste', 'In IT Stock'];
  const pStatuses = ['Working', 'Faulty', 'Missing', 'Replaced'];
  const COLOR_OPTIONS: ('White' | 'Red' | 'Violet' | 'Green')[] = ['White', 'Red', 'Violet', 'Green'];

  const handleAddGatePass = async (data: any) => {
    try {
      const newGP = await addGatePass(asset.id, {
        ...data,
        status: 'Pending'
      });
      setShowGatePassForm(false);
      toast.success('Gate pass added successfully');
      if (newGP) {
        await generateGatePassDoc(newGP);
      }
    } catch (error) {
      toast.error('Failed to add gate pass');
    }
  };

  const handleReturnGatePass = async (gpId: string) => {
    const actualReturnDate = format(new Date(), 'yyyy-MM-dd');
    try {
      await updateGatePass(asset.id, gpId, { 
        status: 'Returned',
        actualReturnDate 
      });
      toast.success('Gate pass marked as returned');
    } catch (error) {
      toast.error('Failed to update gate pass');
    }
  };

  const getHeader = (key: string, defaultLabel: string) => {
    return settings?.gatePassHeaders?.[key] || defaultLabel;
  };

  return (
    <div className={cn("space-y-6 max-h-[80vh] overflow-y-auto pr-2 scrollbar-hide p-4 rounded-xl", getRowColorClass(asset.rowColor))}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{asset.name}</h3>
          <p className="text-sm text-slate-500">{asset.category} • {asset.model}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Badge variant={asset.status === 'Active' ? 'success' : asset.status === 'Move to E-Waste' ? 'error' : 'warning'}>
            {asset.status}
          </Badge>
          {(() => {
            const { status, expiryDate } = getWarrantyStatus(asset.invoiceDate, asset.category, asset.subcategory, asset.warrantyDurationMonths);
            return (
              <div className="flex flex-col items-end space-y-1">
                <Badge status={status} />
                {expiryDate && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Expires: {format(expiryDate, 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === 'details' 
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('gate-pass')}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === 'gate-pass' 
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Gate Pass
        </button>
      </div>

      {activeTab === 'details' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Control Section */}
            <div className="space-y-4">
              <Card className="p-4 space-y-4 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <Activity className="h-5 w-5" />
                  <h4 className="font-bold uppercase tracking-tight">Status Control</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">System-Level Status</label>
                    <select
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:opacity-50"
                      value={systemStatus}
                      onChange={(e) => setSystemStatus(e.target.value as AssetStatus)}
                      disabled={!isAdmin}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Row Colour</label>
                    <div className="flex items-center space-x-2">
                      <Palette className="h-4 w-4 text-slate-400" />
                      <select
                        className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:opacity-50"
                        value={rowColor}
                        onChange={(e) => setRowColor(e.target.value as any)}
                        disabled={!isAdmin}
                      >
                        {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {asset.category === 'Systems' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase">Peripheral Status</label>
                      {['Monitor', 'Keyboard', 'Mouse'].map((p) => (
                        <div key={p} className="flex items-center justify-between space-x-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p}</span>
                          <select
                            className="h-8 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:opacity-50"
                            value={peripheralStatus[p] || 'Working'}
                            onChange={(e) => setPeripheralStatus({ ...peripheralStatus, [p]: e.target.value })}
                            disabled={!isAdmin}
                          >
                            {pStatuses.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {isAdmin && (
                  <Button className="w-full" onClick={handleSave} loading={isUpdating}>
                    Update Status
                  </Button>
                )}
              </Card>
            </div>

            {/* Dynamic Fields from Schema */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Asset Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {effectiveSchema.filter(f => f.key !== 'remarks').map(field => {
                  const value = (asset as any)[field.key] !== undefined ? (asset as any)[field.key] : asset.additionalFields?.[field.key];
                  const Icon = (FIELD_ICONS as any)[field.key] || Info;
                  
                  return (
                    <DetailItem 
                      key={field.key} 
                      icon={Icon} 
                      label={field.label} 
                      value={field.key === 'ramMb' && value ? `${value} MB` : 
                             field.key === 'hddGb' && value ? `${value} GB` : 
                             field.key === 'warrantyDurationMonths' && value ? `${value} Months` : 
                             value} 
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Remarks */}
          {asset.remarks && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Remarks</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{asset.remarks}"</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gate Pass History</h3>
            {isAdmin && !showGatePassForm && (
              <Button size="sm" onClick={() => setShowGatePassForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create New Gate Pass
              </Button>
            )}
          </div>

          {showGatePassForm && isAdmin ? (
            <Card className="p-4 border-indigo-100 bg-indigo-50/30 dark:bg-indigo-900/10 dark:border-indigo-900/30">
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-4 uppercase tracking-wider">Create Gate Pass</h4>
              <GatePassForm 
                asset={asset} 
                settings={settings} 
                onSubmit={handleAddGatePass} 
                onCancel={() => setShowGatePassForm(false)} 
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {(!asset.gatePassHistory || asset.gatePassHistory.length === 0) ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No gate pass history found for this asset.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {[...(asset.gatePassHistory || [])].reverse().map((gp) => (
                    <div key={gp.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          <span className="font-bold text-slate-900 dark:text-white">#{gp.gatePassNo}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => generateGatePassDoc(gp)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Badge variant={gp.status === 'Returned' ? 'success' : 'warning'}>
                            {gp.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 uppercase">{getHeader('receiverName', 'Receiver')}</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{gp.receiverName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">{getHeader('createDate', 'Date Out')}</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{gp.createDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Created By</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{gp.createdBy?.name || 'Admin'}</p>
                        </div>
                        {gp.status === 'Pending' && isAdmin && (
                          <div className="flex items-end">
                            <Button size="sm" variant="outline" onClick={() => handleReturnGatePass(gp.id)}>
                              Mark as Returned
                            </Button>
                          </div>
                        )}
                      </div>
                      {gp.remark && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500 uppercase">{getHeader('remark', 'Remark')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic">{gp.remark}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
