import React, { useState } from 'react';
import { GatePassItem, Asset, GlobalSettings } from '../../types';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface GatePassFormProps {
  asset: Asset;
  settings: GlobalSettings | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GatePassForm: React.FC<GatePassFormProps> = ({ asset, settings, onSubmit, onCancel, isLoading }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    plantName: asset.location || '',
    transporter: '',
    receiverCode: '',
    reason: 'Repair',
    receiverName: asset.vendor || '',
    receiverAddress: '',
    vehicleNo: '',
    gstNo: '',
    lrNo: '',
    requestedBy: user?.name || '',
    deptName: asset.department || '',
    remark: '',
    createDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [items, setItems] = useState<GatePassItem[]>([
    {
      srNo: 1,
      materialCode: asset.sysSlNo || '',
      itemDescription: `${asset.name} - ${asset.model}`,
      hsn: '',
      qty: 1,
      unit: 'Nos',
      remark: 'For Repair'
    }
  ]);

  const getHeader = (key: string, defaultLabel: string) => {
    return settings?.gatePassHeaders?.[key] || defaultLabel;
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        srNo: items.length + 1,
        materialCode: '',
        itemDescription: '',
        hsn: '',
        qty: 1,
        unit: 'Nos',
        remark: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }));
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof GatePassItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, items });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('createDate', 'Create Date')}</label>
          <Input 
            type="date" 
            value={formData.createDate} 
            onChange={(e) => setFormData({ ...formData, createDate: e.target.value })} 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('plantName', 'Plant Name')}</label>
          <Input 
            value={formData.plantName} 
            onChange={(e) => setFormData({ ...formData, plantName: e.target.value })} 
            placeholder="Enter Plant Name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('transporter', 'Transporter')}</label>
          <Input 
            value={formData.transporter} 
            onChange={(e) => setFormData({ ...formData, transporter: e.target.value })} 
            placeholder="Enter Transporter"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('receiverCode', 'Receiver Code')}</label>
          <Input 
            value={formData.receiverCode} 
            onChange={(e) => setFormData({ ...formData, receiverCode: e.target.value })} 
            placeholder="Enter Receiver Code"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('receiverName', 'Receiver Name')}</label>
          <Input 
            value={formData.receiverName} 
            onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })} 
            placeholder="Enter Receiver Name"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('reason', 'Reason')}</label>
          <Input 
            value={formData.reason} 
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
            placeholder="Reason for sending"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('vehicleNo', 'Vehicle No.')}</label>
          <Input 
            value={formData.vehicleNo} 
            onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })} 
            placeholder="Enter Vehicle No."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('gstNo', 'GST No.')}</label>
          <Input 
            value={formData.gstNo} 
            onChange={(e) => setFormData({ ...formData, gstNo: e.target.value })} 
            placeholder="Enter GST No."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('lrNo', 'LR No.')}</label>
          <Input 
            value={formData.lrNo} 
            onChange={(e) => setFormData({ ...formData, lrNo: e.target.value })} 
            placeholder="Enter LR No."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('requestedBy', 'Requested By')}</label>
          <Input 
            value={formData.requestedBy} 
            onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })} 
            placeholder="Requested By"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('deptName', 'Dept. Name')}</label>
          <Input 
            value={formData.deptName} 
            onChange={(e) => setFormData({ ...formData, deptName: e.target.value })} 
            placeholder="Department Name"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('receiverAddress', 'Receiver Address')}</label>
        <textarea 
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          rows={2}
          value={formData.receiverAddress} 
          onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })} 
          placeholder="Enter Receiver Address"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 uppercase">{getHeader('remark', 'Remark')}</label>
        <textarea 
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          rows={2}
          value={formData.remark} 
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })} 
          placeholder="Enter Remark"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Item Table</h4>
          <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 w-16">SR.</th>
                <th className="px-3 py-2">Material Code</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 w-24">HSN</th>
                <th className="px-3 py-2 w-20">Qty</th>
                <th className="px-3 py-2 w-24">Unit</th>
                <th className="px-3 py-2">Remark</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-center">{item.srNo}</td>
                  <td className="px-3 py-2">
                    <Input 
                      value={item.materialCode} 
                      onChange={(e) => handleItemChange(index, 'materialCode', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={item.itemDescription} 
                      onChange={(e) => handleItemChange(index, 'itemDescription', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={item.hsn} 
                      onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      type="number"
                      value={item.qty} 
                      onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={item.unit} 
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={item.remark} 
                      onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {items.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          <FileText className="h-4 w-4 mr-2" /> Create Gate Pass
        </Button>
      </div>
    </form>
  );
};
