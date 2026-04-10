import React, { useMemo, useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Trash2, RefreshCw, Search, Package, Monitor, Printer, Laptop, FileCode, AlertCircle } from 'lucide-react';
import { Asset, AssetCategory } from '../types';
import { cn } from '../utils/cn';
import { ConfirmModal } from '../components/UI/ConfirmModal';

import { LoadingSpinner } from '../components/UI/LoadingSpinner';

export const EWastePage: React.FC = () => {
  const { assets, updateAsset, deleteAsset, bulkDelete, bulkUpdateStatus, isLoading } = useAssets();
  const { user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading recycle bin..." />;
  }
  const isAdmin = user?.role === 'Admin';

  const [search, setSearch] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const ewasteAssets = useMemo(() => {
    const searchLower = (search || '').toLowerCase();
    return assets.filter(a => (a.status === 'E-Waste' || a.status === 'Move to E-Waste') && (
      (a.name || '').toLowerCase().includes(searchLower) ||
      (a.sysSlNo || '').toLowerCase().includes(searchLower) ||
      (a.model || '').toLowerCase().includes(searchLower) ||
      (a.vendor || '').toLowerCase().includes(searchLower) ||
      (a.department || '').toLowerCase().includes(searchLower)
    ));
  }, [assets, search]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      Hardware: 0,
      Software: 0,
    };
    ewasteAssets.forEach(a => {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    });
    return counts;
  }, [ewasteAssets]);

  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    try {
      await updateAsset(id, { status: 'Active' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedAssetIds.length === 0) return;
    setIsProcessing(true);
    try {
      await bulkUpdateStatus(selectedAssetIds, 'Active');
      setSelectedAssetIds([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setAssetToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    setIsProcessing(true);
    try {
      await deleteAsset(assetToDelete);
      setIsDeleteConfirmOpen(false);
      setAssetToDelete(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await bulkDelete(selectedAssetIds);
      setSelectedAssetIds([]);
      setIsBulkDeleteConfirmOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.length === ewasteAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(ewasteAssets.map(a => a.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recycle Bin (E-Waste)</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage assets marked for disposal or recycling.</p>
        </div>
        {isAdmin && selectedAssetIds.length > 0 && (
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleBulkRestore} disabled={isProcessing}>
              <RefreshCw className="mr-2 h-4 w-4" /> Restore Selected
            </Button>
            <Button variant="outline" onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={isProcessing} className="text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> Permanently Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 flex items-center space-x-4">
          <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hardware Assets</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.Hardware}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center space-x-4">
          <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/20">
            <FileCode className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Software Assets</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.Software}</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search e-waste assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedAssetIds.length > 0 && selectedAssetIds.length === ewasteAssets.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3">Asset Name</th>
                <th className="px-4 py-3">Serial No</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {ewasteAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Trash2 className="mb-2 h-12 w-12 opacity-20" />
                      <p>Recycle bin is empty</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ewasteAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={selectedAssetIds.includes(asset.id)}
                        onChange={() => setSelectedAssetIds(prev => 
                          prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id]
                        )}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{asset.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{asset.sysSlNo}</td>
                    <td className="px-4 py-3">
                      <Badge status={asset.category} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{asset.model || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{asset.department || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{asset.vendor || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{asset.invoiceDate || 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleRestore(asset.id)} title="Restore Asset">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} className="text-red-500 hover:text-red-600" title="Permanently Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Permanently Delete Asset"
        message="Are you sure you want to permanently delete this asset from the recycle bin? This action cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
        isLoading={isProcessing}
      />

      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Permanently Delete Multiple Assets"
        message={`Are you sure you want to permanently delete ${selectedAssetIds.length} selected assets? This action cannot be undone.`}
        confirmText="Delete All Permanently"
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  );
};
