import React, { useEffect, useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import { ArrowLeft, Calendar, User, Hash, Box, MapPin, Building2, DollarSign, ShieldCheck, History, Wrench, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO, isValid } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';
import { MaintenanceRecord, Asset, AssetStatus, GatePass } from '../types';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { toast } from 'sonner';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import { getAssetValue } from '../utils/assetUtils';

interface AssetDetailPageProps {
  assetId: string;
  onBack: () => void;
}

export const AssetDetailPage: React.FC<AssetDetailPageProps> = ({ assetId, onBack }) => {
  const { getAssetById, getMaintenanceRecords, addMaintenanceRecord, updateAsset, deleteAsset, getWarrantyStatus, getAssetHistory, settings, addGatePass, updateGatePass, deleteGatePass, vendors } = useAssets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'maintenance' | 'history' | 'gate-pass'>('details');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAssetHistory, setLoadingAssetHistory] = useState(false);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Asset>>({});
  const [isRetireConfirmOpen, setIsRetireConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isGPDeleteConfirmOpen, setIsGPDeleteConfirmOpen] = useState(false);
  const [gpToDelete, setGpToDelete] = useState<{ id: string, no: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    description: '',
    performedBy: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    cost: 0
  });

  const [showGatePassForm, setShowGatePassForm] = useState(false);
  const [gatePassFormData, setGatePassFormData] = useState({
    gatePassNo: '',
    vendor: '',
    dateOut: format(new Date(), 'yyyy-MM-dd'),
    expectedReturn: '',
    contactPerson: '',
    remarks: '',
  });

  const asset = getAssetById(assetId);
  const { getEffectiveSchema } = useAssets();
  const effectiveSchema = asset ? getEffectiveSchema(asset.category, asset.subcategory) : [];

  const getFieldValue = (key: string) => {
    return getAssetValue(asset, key);
  };

  const displayName = getFieldValue('name') || 'N/A';
  const displaySerial = getFieldValue('sysSlNo') || 'N/A';

  useEffect(() => {
    if (asset) {
      setEditData(asset);
      if (asset.status === 'In Repair' && isAdmin) {
        setShowGatePassForm(true);
      }
      setGatePassFormData(prev => ({
        ...prev,
        vendor: asset.vendor || ''
      }));
    }
  }, [asset, isAdmin]);

  const getHeader = (key: string, defaultLabel: string) => {
    return settings?.gatePassHeaders?.[key] || defaultLabel;
  };

  const handleAddGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    try {
      await addGatePass(asset.id, gatePassFormData);
      toast.success('Gate pass created successfully');
      setShowGatePassForm(false);
      setGatePassFormData({
        gatePassNo: '',
        vendor: asset.vendor || '',
        dateOut: format(new Date(), 'yyyy-MM-dd'),
        expectedReturn: '',
        contactPerson: '',
        remarks: '',
      });
    } catch (error) {
      toast.error('Failed to create gate pass');
    }
  };

  const handleReturnGatePass = async (gpId: string) => {
    if (!asset) return;
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

  const fetchHistory = async () => {
    if (assetId) {
      setLoadingHistory(true);
      const records = await getMaintenanceRecords(assetId);
      setMaintenanceHistory(records);
      setLoadingHistory(false);
    }
  };

  const fetchAssetHistory = async () => {
    if (assetId) {
      setLoadingAssetHistory(true);
      const history = await getAssetHistory(assetId);
      setAssetHistory(history);
      setLoadingAssetHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [assetId, getMaintenanceRecords]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAssetHistory();
    }
  }, [assetId, activeTab]);

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    await addMaintenanceRecord(assetId, newMaintenance);
    setIsAddingMaintenance(false);
    setNewMaintenance({
      description: '',
      performedBy: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      cost: 0
    });
    fetchHistory();
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !editData) return;
    await updateAsset(assetId, editData);
    setIsEditing(false);
  };

  const handleRetireAsset = () => {
    if (!assetId) return;
    setIsRetireConfirmOpen(true);
  };

  const confirmRetire = async () => {
    if (!assetId) return;
    setIsProcessing(true);
    try {
      await updateAsset(assetId, { status: 'E-Waste' });
      setIsRetireConfirmOpen(false);
    } catch (error) {
      console.error('Error retiring asset:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAsset = () => {
    if (!assetId) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!assetId) return;
    setIsProcessing(true);
    try {
      await deleteAsset(assetId);
      setIsDeleteConfirmOpen(false);
      onBack();
    } catch (error) {
      console.error('Error deleting asset:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Asset not found</h2>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const { status: warrantyStatus, expiryDate } = getWarrantyStatus(asset);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{displayName}</h2>
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <span>{displaySerial}</span>
              <span>•</span>
              <Badge status={asset.status} />
              <span>•</span>
              {(() => {
                const { status, expiryDate } = getWarrantyStatus(asset);
                return (
                  <div className="flex items-center space-x-2">
                    <Badge status={status} />
                    {expiryDate && (
                      <span className="text-[10px] font-medium text-slate-500">
                        Expires: {format(expiryDate, 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Asset</Button>
              <Button variant="outline" onClick={handleRetireAsset} className="text-amber-600 border-amber-200 hover:bg-amber-50">Move to E-Waste</Button>
              <Button variant="danger" onClick={handleDeleteAsset}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Asset
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <Card className="mb-8">
          <form onSubmit={handleUpdateAsset} className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Asset Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Asset Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">System Serial No</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.sysSlNo || ''}
                  onChange={(e) => setEditData({ ...editData, sysSlNo: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Model</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.model || ''}
                  onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Category</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.category || ''}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value as any })}
                >
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="E-Waste">E-Waste</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Department</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.department || ''}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Value ($)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.value || 0}
                  onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  value={editData.status || ''}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                >
                  <option value="Active">Active</option>
                  <option value="In Repair">In Repair</option>
                  <option value="In IT Stock">In IT Stock</option>
                  <option value="E-Waste">E-Waste</option>
                  <option value="Expired">Expired</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit">Update Asset</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'details'
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'maintenance'
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Maintenance
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'history'
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('gate-pass')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'gate-pass'
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Gate Pass
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-6">
              <Card>
                <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Asset Details</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {effectiveSchema.filter(f => f.key !== 'remarks').map(field => {
                    const value = getFieldValue(field.key);
                    let Icon = Hash;
                    if (field.key.toLowerCase().includes('date')) Icon = Calendar;
                    if (field.key.toLowerCase().includes('user') || field.key.toLowerCase().includes('assigned')) Icon = User;
                    if (field.key.toLowerCase().includes('location')) Icon = MapPin;
                    if (field.key.toLowerCase().includes('dept') || field.key.toLowerCase().includes('vendor')) Icon = Building2;
                    if (field.key.toLowerCase().includes('value') || field.key.toLowerCase().includes('cost')) Icon = DollarSign;
                    if (field.key.toLowerCase().includes('warranty')) Icon = ShieldCheck;
                    if (field.key.toLowerCase().includes('model') || field.key.toLowerCase().includes('system')) Icon = Box;

                    return (
                      <div key={field.key} className="flex items-start space-x-3">
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{field.label}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {field.key.toLowerCase().includes('date') && value ? safeFormat(value, 'MMMM d, yyyy') : 
                             field.key === 'value' ? `$${(Number(value) || 0).toLocaleString()}` :
                             field.key === 'ramMb' ? `${value} MB` :
                             field.key === 'hddGb' ? `${value} GB` :
                             field.key === 'warrantyDurationMonths' ? `${value} Months` :
                             value || 'N/A'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {asset.remarks && (
                <Card>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Remarks</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{asset.remarks}"</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <Card>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Wrench className="mr-2 h-5 w-5 text-indigo-500" /> Maintenance History
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsAddingMaintenance(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Entry
                </Button>
              </div>

              {isAddingMaintenance && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <form onSubmit={handleAddMaintenance} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                        <input
                          type="text"
                          required
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                          value={newMaintenance.description}
                          onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                          placeholder="e.g., Annual Service"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Performed By</label>
                        <input
                          type="text"
                          required
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                          value={newMaintenance.performedBy}
                          onChange={(e) => setNewMaintenance({ ...newMaintenance, performedBy: e.target.value })}
                          placeholder="e.g., IT Support"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
                        <input
                          type="date"
                          required
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                          value={newMaintenance.date}
                          onChange={(e) => setNewMaintenance({ ...newMaintenance, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Cost ($)</label>
                        <input
                          type="number"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                          value={newMaintenance.cost}
                          onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingMaintenance(false)}>Cancel</Button>
                      <Button type="submit" size="sm">Save Entry</Button>
                    </div>
                  </form>
                </div>
              )}
              <div className="space-y-6">
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                  </div>
                ) : maintenanceHistory.length > 0 ? (
                  maintenanceHistory.map((record) => (
                    <div key={record.id} className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 pb-6 last:pb-0">
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{record.description}</p>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">
                              {(() => {
                                try {
                                  const pDate = parseISO(record.date);
                                  return isNaN(pDate.getTime()) ? 'Invalid Date' : format(pDate, 'MMM d, yyyy');
                                } catch (e) {
                                  return 'Invalid Date';
                                }
                              })()}
                            </span>
                            {record.cost !== undefined && record.cost > 0 && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">${(record.cost || 0).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Performed by: {record.performedBy}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <p>No maintenance records found for this asset.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'gate-pass' && (
            <Card>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-indigo-500" /> Gate Pass History
                </h3>
                {isAdmin && asset.status === 'In Repair' && (
                  <Button variant="ghost" size="sm" onClick={() => setShowGatePassForm(!showGatePassForm)}>
                    <Plus className="mr-1 h-4 w-4" /> {showGatePassForm ? 'Cancel' : 'New Gate Pass'}
                  </Button>
                )}
              </div>

              {showGatePassForm && isAdmin && (
                <div className="mb-8 rounded-xl border border-indigo-100 bg-indigo-50/30 p-6 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                  <h4 className="mb-4 text-sm font-bold text-indigo-900 dark:text-indigo-100">Create New Gate Pass</h4>
                  <form onSubmit={handleAddGatePass} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('gatePassNo', 'Gate Pass No.')}</label>
                      <input
                        type="text"
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        value={gatePassFormData.gatePassNo}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, gatePassNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('vendor', 'Vendor')}</label>
                      <input
                        type="text"
                        required
                        list="vendor-suggestions"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        value={gatePassFormData.vendor}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, vendor: e.target.value })}
                      />
                      <datalist id="vendor-suggestions">
                        {vendors.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('dateOut', 'Date Out')}</label>
                      <input
                        type="date"
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        value={gatePassFormData.dateOut}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, dateOut: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('expectedReturn', 'Expected Return')}</label>
                      <input
                        type="date"
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        value={gatePassFormData.expectedReturn}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, expectedReturn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('contactPerson', 'Contact Person')}</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        value={gatePassFormData.contactPerson}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeader('remarks', 'Remarks / Notes')}</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        rows={2}
                        value={gatePassFormData.remarks}
                        onChange={(e) => setGatePassFormData({ ...gatePassFormData, remarks: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end space-x-3">
                      <Button type="button" variant="ghost" onClick={() => setShowGatePassForm(false)}>Cancel</Button>
                      <Button type="submit">Create Gate Pass</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {asset.gatePassHistory && asset.gatePassHistory.length > 0 ? (
                  asset.gatePassHistory.slice().reverse().map((gp) => (
                    <div key={gp.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white">{gp.gatePassNo}</span>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              gp.status === 'Returned' 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              {gp.status === 'Returned' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                              {gp.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Vendor: <span className="font-medium text-slate-900 dark:text-white">{gp.vendor}</span></p>
                        </div>
                        {gp.status === 'Pending' && isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => handleReturnGatePass(gp.id)}>
                            Mark Returned
                          </Button>
                        )}
                        {isAdmin && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-slate-400 hover:text-red-500"
                            onClick={() => {
                              setGpToDelete({ id: gp.id, no: gp.gatePassNo });
                              setIsGPDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                        <div>
                          <p className="font-medium text-slate-400 uppercase tracking-wider">Date Out</p>
                          <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{safeFormat(gp.dateOut, 'dd MMM yyyy')}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-400 uppercase tracking-wider">Expected Return</p>
                          <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{safeFormat(gp.expectedReturn, 'dd MMM yyyy')}</p>
                        </div>
                        {gp.actualReturnDate && (
                          <div>
                            <p className="font-medium text-slate-400 uppercase tracking-wider">Actual Return</p>
                            <p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">{safeFormat(gp.actualReturnDate, 'dd MMM yyyy')}</p>
                          </div>
                        )}
                        {gp.contactPerson && (
                          <div>
                            <p className="font-medium text-slate-400 uppercase tracking-wider">Contact</p>
                            <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{gp.contactPerson}</p>
                          </div>
                        )}
                      </div>
                      {gp.remarks && (
                        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks</p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 italic">"{gp.remarks}"</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <FileText className="mb-4 h-12 w-12 opacity-20" />
                    <p>No gate pass history found.</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <Card>
            <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Warranty Details</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                {(() => {
                  const { status } = getWarrantyStatus(asset);
                  return <Badge status={status} />;
                })()}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Duration</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {getFieldValue('warrantyDurationMonths') ? `${getFieldValue('warrantyDurationMonths')} Months` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Expiry Date</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {(() => {
                    const { expiryDate } = getWarrantyStatus(asset);
                    return expiryDate ? format(expiryDate, 'dd MMM yyyy') : 'N/A';
                  })()}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Location</h3>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{asset.location || 'Unknown'}</p>
                <p className="text-xs text-slate-500">Headquarters</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isRetireConfirmOpen}
        onClose={() => setIsRetireConfirmOpen(false)}
        onConfirm={confirmRetire}
        title="Move to E-Waste"
        message="Are you sure you want to move this asset to E-Waste? This will mark it as Move to E-Waste."
        confirmText="Move to E-Waste"
        isLoading={isProcessing}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Asset"
        message="Are you sure you want to permanently delete this asset? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isProcessing}
      />

      <ConfirmModal
        isOpen={isGPDeleteConfirmOpen}
        onClose={() => setIsGPDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (gpToDelete && asset) {
            try {
              await deleteGatePass(asset.id, gpToDelete.id);
              toast.success('Gate pass deleted successfully');
            } catch (error) {
              toast.error('Failed to delete gate pass');
            }
          }
          setIsGPDeleteConfirmOpen(false);
        }}
        title="Delete Gate Pass"
        message={`Are you sure you want to delete Gate Pass ${gpToDelete?.no}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </motion.div>
  );
};
