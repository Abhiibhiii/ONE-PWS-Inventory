import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Alert, Asset } from '../../types';
import { useAssets } from '../../hooks/useAssets';
import { useAlerts } from '../../hooks/useAlerts';
import { Badge } from '../UI/Badge';
import { Calendar, User, Shield, ArrowRight, CheckCircle, Mail, Download } from 'lucide-react';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface TakeActionModalProps {
  alert: Alert | null;
  onClose: () => void;
}

export const TakeActionModal: React.FC<TakeActionModalProps> = ({ alert, onClose }) => {
  const { assets, updateAsset, settings } = useAssets();
  const { resolveAlert } = useAlerts();
  const [loading, setLoading] = useState(false);

  if (!alert) return null;

  const affectedAssets = assets.filter(asset => {
    if (alert.type === 'Warranty') {
      if (!asset.invoiceDate) return false;
      try {
        const pDate = parseISO(asset.invoiceDate);
        if (isNaN(pDate.getTime())) return false;
        
        const duration = asset.warrantyDurationMonths || 
          (asset.category === 'Systems' ? settings?.systemWarrantyMonths :
           asset.category === 'Printers' ? settings?.printerWarrantyMonths :
           asset.category === 'Laptops' ? settings?.laptopWarrantyMonths : 0);
        if (!duration) return false;
        
        const expiryDate = addMonths(pDate, duration);
        if (isNaN(expiryDate.getTime())) return false;
        
        const daysRemaining = differenceInDays(expiryDate, new Date());
        return daysRemaining <= 30 && daysRemaining > 0;
      } catch (e) {
        return false;
      }
    }
    if (alert.type === 'Unassigned') {
      return !asset.assignedTo && asset.status === 'Active';
    }
    if (alert.type === 'Maintenance') {
      return asset.id === alert.assetId;
    }
    return false;
  });

  const handleAction = async (action: string, assetId?: string) => {
    setLoading(true);
    try {
      if (alert.type === 'Warranty' && action === 'Renew') {
        // Logic to renew warranty (e.g., add 12 months)
        if (assetId) {
          const asset = assets.find(a => a.id === assetId);
          if (asset) {
            await updateAsset(assetId, { 
              warrantyDurationMonths: (asset.warrantyDurationMonths || 0) + 12 
            });
          }
        }
      } else if (alert.type === 'Warranty' && action === 'Replace') {
        if (assetId) {
          await updateAsset(assetId, { status: 'Move to E-Waste' });
        }
      } else if (alert.type === 'Unassigned' && action === 'Assign') {
        // This would normally open another modal for user selection
        // For now, we'll just mock it or mark as "In Storage"
        if (assetId) {
          await updateAsset(assetId, { assignedTo: 'In Storage' });
        }
      }

      // If it's a single asset action or all assets are handled, resolve alert
      if (affectedAssets.length <= 1) {
        await resolveAlert(alert.id, `Action taken: ${action}`);
        toast.success('Action completed successfully');
        onClose();
      } else {
        toast.success(`Action completed for asset`);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!alert} onClose={onClose} title={`Take Action: ${alert.type} Alert`}>
      <div className="space-y-6">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{alert.suggestion}</p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="pb-2 pr-4">Asset Name</th>
                <th className="pb-2 pr-4">Category</th>
                {alert.type === 'Warranty' && <th className="pb-2 pr-4">Expiry</th>}
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {affectedAssets.map(asset => (
                <tr key={asset.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{asset.name}</td>
                  <td className="py-3 pr-4">
                    <Badge status={asset.category} />
                  </td>
                  {alert.type === 'Warranty' && (
                    <td className="py-3 pr-4 text-slate-500">
                      {asset.invoiceDate ? (() => {
                        try {
                          const pDate = parseISO(asset.invoiceDate);
                          if (isNaN(pDate.getTime())) return '-';
                          const expiryDate = addMonths(pDate, asset.warrantyDurationMonths || 0);
                          if (isNaN(expiryDate.getTime())) return '-';
                          return format(expiryDate, 'MMM dd, yyyy');
                        } catch (e) {
                          return '-';
                        }
                      })() : '-'}
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      {alert.type === 'Warranty' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleAction('Renew', asset.id)} disabled={loading}>
                            Renew
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleAction('Replace', asset.id)} disabled={loading}>
                            Replace
                          </Button>
                        </>
                      ) : alert.type === 'Unassigned' ? (
                        <Button size="sm" variant="outline" onClick={() => handleAction('Assign', asset.id)} disabled={loading}>
                          Assign
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleAction('Complete', asset.id)} disabled={loading}>
                          Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between border-t pt-6 dark:border-slate-800">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-slate-500">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500">
              <Mail className="mr-2 h-4 w-4" /> Notify Vendor
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};
