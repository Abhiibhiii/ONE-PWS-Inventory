import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory, AssetStatus, AssetSubcategory, FieldDefinition } from '../../types';
import { cn } from '../../utils/cn';
import { getRowColorClass, getAssetValue } from '../../utils/assetUtils';
import { Input } from '../UI/Input';
import { Button } from '../UI/Button';
import { useAssets } from '../../hooks/useAssets';
import { 
  Trash2, 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Monitor,
  Cpu,
  HardDrive,
  Hash,
  Calendar,
  User,
  MapPin,
  Building2,
  Tag,
  ShieldCheck,
  Info,
  Laptop,
  Printer,
  Network,
  Tv,
  Mail,
  PenTool,
  FileText,
  Layout,
  Database,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../UI/ConfirmModal';
import { extractInvoiceData, InvoiceData, isAIEnabled } from '../../services/ocrService';
import { OcrValidationModal } from './OcrValidationModal';
import { motion, AnimatePresence } from 'motion/react';
import { ASSET_SCHEMA, COMMON_FIELDS } from '../../constants/assetSchema';
import { OFFICIAL_DEPARTMENTS } from '../../constants/departments';

interface AssetFormProps {
  initialData?: Asset;
  onSubmit: (data: Omit<Asset, 'id' | 'uid'>) => void;
  onCancel: () => void;
  departments?: string[];
}

const CATEGORY_ICONS: Record<string, any> = {
  'Hardware': Cpu,
  'Software': Database,
};

const SUBCATEGORY_ICONS: Record<string, any> = {
  'System': Cpu,
  'Printer': Printer,
  'Laptop': Laptop,
  'Networking': Network,
  'Display': Tv,
  'Others': HelpCircle,
  'Gmail': Mail,
  'AutoCAD': PenTool,
  'Adobe Acrobat': FileText,
  'Microsoft Office': Layout,
  'SAP': Database,
};

const FIELD_ICONS: Record<string, any> = {
  name: Tag,
  sysSlNo: Hash,
  model: Monitor,
  invoiceDate: Calendar,
  invoiceNo: Hash,
  vendor: Building2,
  warrantyDurationMonths: ShieldCheck,
  value: Tag,
  department: Building2,
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
  ipAddress: Network,
  dynamicIp: Network,
  remarks: Info,
};

export const AssetForm: React.FC<AssetFormProps> = ({ initialData, onSubmit, onCancel, departments = [] }) => {
  const { deleteAsset, settings, assets, getEffectiveSchema } = useAssets();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [highlightFields, setHighlightFields] = useState<string[]>([]);
  const [ocrData, setOcrData] = useState<InvoiceData | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Asset, 'id' | 'uid'>>({
    name: getAssetValue(initialData, 'name') || '',
    sysSlNo: getAssetValue(initialData, 'sysSlNo') || '',
    model: getAssetValue(initialData, 'model') || '',
    category: initialData?.category || 'Hardware',
    subcategory: initialData?.subcategory || 'System',
    status: initialData?.status || 'Active',
    rowColor: initialData?.rowColor || 'White',
    invoiceDate: getAssetValue(initialData, 'invoiceDate') || (initialData ? '' : new Date().toISOString().split('T')[0]),
    invoiceNo: getAssetValue(initialData, 'invoiceNo') || '',
    vendor: getAssetValue(initialData, 'vendor') || '',
    warrantyDurationMonths: getAssetValue(initialData, 'warrantyDurationMonths') || (
      initialData ? 0 : (
        initialData?.category === 'Software' 
          ? (settings?.softwareWarranty?.['Mail'] || 12)
          : (settings?.hardwareWarranty?.['System'] || 36)
      )
    ),
    value: getAssetValue(initialData, 'value') || 0,
    department: getAssetValue(initialData, 'department') || '',
    location: getAssetValue(initialData, 'location') || '',
    assignedTo: initialData?.assignedTo || null,
    systemName: getAssetValue(initialData, 'systemName') || '',
    processor: getAssetValue(initialData, 'processor') || '',
    ramMb: getAssetValue(initialData, 'ramMb') || 0,
    hddGb: getAssetValue(initialData, 'hddGb') || 0,
    os: getAssetValue(initialData, 'os') || '',
    licenseType: getAssetValue(initialData, 'licenseType') || '',
    productKey: getAssetValue(initialData, 'productKey') || '',
    monitor: getAssetValue(initialData, 'monitor') || '',
    monitorSn: getAssetValue(initialData, 'monitorSn') || '',
    keyboard: getAssetValue(initialData, 'keyboard') || '',
    mouse: getAssetValue(initialData, 'mouse') || '',
    usbStatus: getAssetValue(initialData, 'usbStatus') || 'Enabled',
    ipAddress: getAssetValue(initialData, 'ipAddress') || '',
    dynamicIp: getAssetValue(initialData, 'dynamicIp') || 'No',
    remarks: initialData?.remarks || '',
    maintenanceHistory: initialData?.maintenanceHistory || [],
    additionalFields: initialData?.additionalFields || {},
  });

  // Get unique vendors for auto-suggestion
  const historicalVendors = React.useMemo(() => {
    const vendors = assets
      .map(a => a.vendor)
      .filter((v): v is string => !!v && v !== 'N/A')
      .map(v => v.trim());
    return Array.from(new Set(vendors)).sort();
  }, [assets]);

  // Update subcategory and default warranty when category changes
  useEffect(() => {
    if (!initialData) {
      const defaultSub = formData.category === 'Hardware' ? 'System' : 'Mail';
      const defaultWarranty = formData.category === 'Hardware' 
        ? (settings?.hardwareWarranty?.[defaultSub] || 36)
        : (settings?.softwareWarranty?.[defaultSub] || 12);

      setFormData(prev => ({ 
        ...prev, 
        subcategory: defaultSub as AssetSubcategory,
        warrantyDurationMonths: defaultWarranty
      }));
    }
  }, [formData.category, initialData, settings]);

  // Update default warranty when subcategory changes
  useEffect(() => {
    if (!initialData) {
      const defaultWarranty = formData.category === 'Hardware' 
        ? (settings?.hardwareWarranty?.[formData.subcategory] || 36)
        : (settings?.softwareWarranty?.[formData.subcategory] || 12);
      
      setFormData(prev => ({ 
        ...prev, 
        warrantyDurationMonths: defaultWarranty
      }));
    }
  }, [formData.subcategory, formData.category, initialData, settings]);

  const handleDelete = () => {
    if (initialData) {
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!initialData) return;
    setIsDeleting(true);
    try {
      await deleteAsset(initialData.id);
      setIsDeleteConfirmOpen(false);
      onCancel();
    } catch (error) {
      console.error('Error deleting asset:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final sanitization
    const sanitizedData = { ...formData };
    
    // Normalize fields
    if (sanitizedData.department) sanitizedData.department = sanitizedData.department.trim();
    if (sanitizedData.location) sanitizedData.location = sanitizedData.location.trim();
    if (sanitizedData.vendor) sanitizedData.vendor = sanitizedData.vendor.trim();
    
    // Enforce uppercase for specific fields
    if (sanitizedData.productKey) sanitizedData.productKey = sanitizedData.productKey.toUpperCase();
    if (sanitizedData.sysSlNo) sanitizedData.sysSlNo = sanitizedData.sysSlNo.toUpperCase();
    if (sanitizedData.additionalFields?.['Windows Key']) {
      sanitizedData.additionalFields['Windows Key'] = String(sanitizedData.additionalFields['Windows Key']).toUpperCase();
    }
    
    onSubmit(sanitizedData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = type === 'number' ? parseFloat(value) || 0 : value;

    // Enforce uppercase for specific fields during input
    if (name === 'productKey' || name === 'sysSlNo' || name === 'additionalFields.Windows Key') {
      processedValue = String(processedValue).toUpperCase();
    }

    if (name.startsWith('additionalFields.')) {
      const fieldName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        additionalFields: {
          ...prev.additionalFields,
          [fieldName]: processedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAIEnabled()) {
      toast.error('AI service is not configured. Please add GEMINI_API_KEY to your environment variables.');
      return;
    }

    setIsOcrLoading(true);
    setOcrSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const data = await extractInvoiceData(base64, file.type);
          
          setOcrData(data);
          setIsOcrModalOpen(true);
        } catch (error: any) {
          console.error('OCR failed:', error);
          toast.error(error.message || 'Failed to extract data from invoice. Please try again.');
        } finally {
          setIsOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('OCR failed:', error);
      toast.error('Failed to read file. Please try again.');
      setIsOcrLoading(false);
    }
  };

  const handleOcrConfirm = (validatedData: {
    purchaseDate: string;
    warrantyMonths: number;
    vendor: string;
    invoiceNo: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      invoiceDate: validatedData.purchaseDate || prev.invoiceDate,
      warrantyDurationMonths: validatedData.warrantyMonths || prev.warrantyDurationMonths,
      vendor: validatedData.vendor || prev.vendor,
      invoiceNo: validatedData.invoiceNo || prev.invoiceNo,
    }));
    
    setIsOcrModalOpen(false);
    setOcrSuccess(true);
    setHighlightFields(['invoiceDate', 'warrantyDurationMonths', 'vendor', 'invoiceNo']);
    setTimeout(() => {
      setOcrSuccess(false);
      setHighlightFields([]);
    }, 3000);
  };

  const renderField = (fieldName: string, config: any, isAdditional: boolean = false) => {
    const Icon = FIELD_ICONS[fieldName] || Info;
    const value = isAdditional 
      ? formData.additionalFields?.[fieldName] ?? ''
      : (formData as any)[fieldName] ?? '';
    const inputName = isAdditional ? `additionalFields.${fieldName}` : fieldName;
    const isHighlighted = highlightFields.includes(fieldName);

    if (fieldName === 'department' || fieldName === 'location') {
      const options = fieldName === 'department' 
        ? (departments.length > 0 ? departments.filter(d => d !== 'All') : OFFICIAL_DEPARTMENTS)
        : (assets.length > 0 ? Array.from(new Set(assets.map(a => a.location).filter(Boolean))).sort() : []);

      return (
        <div key={fieldName} className="space-y-1.5">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Icon className="mr-2 h-4 w-4 text-slate-400" />
            {config.label}
          </label>
          <input
            list={`${fieldName}-options`}
            name={inputName}
            value={value}
            onChange={handleChange}
            placeholder={`Type or select ${fieldName}`}
            className={cn(
              "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
              isHighlighted && "ring-2 ring-emerald-500 animate-pulse"
            )}
          />
          <datalist id={`${fieldName}-options`}>
            {options.map((opt: string) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    if (config.type === 'select') {
      const options = config.options || [];
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Icon className="mr-2 h-4 w-4 text-slate-400" />
            {config.label}
          </label>
          <select
            name={inputName}
            value={value}
            onChange={handleChange}
            className={cn(
              "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
              isHighlighted && "ring-2 ring-emerald-500 animate-pulse"
            )}
          >
            <option value="">Select Department</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <div key={fieldName} className="col-span-full space-y-1.5">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Icon className="mr-2 h-4 w-4 text-slate-400" />
            {config.label}
          </label>
          <textarea
            name={inputName}
            value={value}
            onChange={handleChange}
            rows={3}
            className={cn(
              "flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white",
              isHighlighted && "ring-2 ring-emerald-500 animate-pulse"
            )}
          />
        </div>
      );
    }

    if (fieldName === 'vendor') {
      return (
        <div key={fieldName} className="space-y-1.5 relative">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Icon className="mr-2 h-4 w-4 text-slate-400" />
            {config.label}
          </label>
          <div className="relative">
            <Input
              type="text"
              name={inputName}
              value={value}
              onChange={handleChange}
              onFocus={() => setShowVendorSuggestions(true)}
              onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
              autoComplete="off"
              className={cn(isHighlighted && "ring-2 ring-emerald-500 animate-pulse")}
            />
            {showVendorSuggestions && historicalVendors.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {historicalVendors
                  .filter(v => v.toLowerCase().includes(String(value).toLowerCase()))
                  .map(vendor => (
                    <button
                      key={vendor}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, vendor }));
                        setShowVendorSuggestions(false);
                      }}
                    >
                      {vendor}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <Input
        key={fieldName}
        label={config.label}
        type={config.type}
        name={inputName}
        value={value}
        onChange={handleChange}
        required={config.required}
        className={cn(isHighlighted && "ring-2 ring-emerald-500 animate-pulse")}
      />
    );
  };

  const effectiveSchema = getEffectiveSchema(formData.category, formData.subcategory);
  const commonKeys = new Set(COMMON_FIELDS.map(f => f.key));

  const subcategories = formData.category === 'Hardware' 
    ? ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others', 'Vacant Systems (IT Stock)']
    : ['Mail', 'Password Sheet', 'Master Sheet', 'Project', 'AutoCAD', 'Adobe Acrobat', 'Microsoft Office', 'SAP'];

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6 max-h-[70vh] overflow-y-auto px-4 py-4 rounded-xl transition-colors", getRowColorClass(formData.rowColor))}>
      {/* Invoice Upload Section */}
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-fill via Invoice</p>
              <p className="text-xs text-slate-500">
                {isAIEnabled() 
                  ? "Upload PDF or Image to extract warranty data" 
                  : "AI features are currently disabled (missing API key)"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isAIEnabled() && (
              <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 mr-2">
                <AlertCircle className="mr-1 h-3 w-3" />
                Config Required
              </div>
            )}
            {isOcrLoading && (
              <div className="flex items-center text-xs text-slate-500">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Extracting...
              </div>
            )}
            <AnimatePresence>
              {ocrSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Invoice data applied</span>
                </motion.div>
              )}
            </AnimatePresence>
            <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              Upload Invoice
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleInvoiceUpload} disabled={isOcrLoading} />
            </label>
          </div>
        </div>
      </div>

      {/* Category & Subcategory Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
          <div className="flex space-x-2">
            {(['Hardware', 'Software'] as AssetCategory[]).map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const isActive = formData.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    category: cat,
                    subcategory: cat === 'Hardware' ? 'Others' : cat === 'Software' ? 'Gmail' : 'Others'
                  }))}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    isActive 
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subcategory</label>
          <select
            name="subcategory"
            value={formData.subcategory}
            onChange={handleChange}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {subcategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* Dynamic Fields */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Status and Row Color */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {['Active', 'In Repair', 'Replaced', 'Move to E-Waste', 'In IT Stock'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Row Colour</label>
          <select
            name="rowColor"
            value={formData.rowColor}
            onChange={handleChange}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {['White', 'Red', 'Violet', 'Green'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {effectiveSchema.filter(f => f.key !== 'remarks').map((field) => 
          renderField(field.key, field, !commonKeys.has(field.key))
        )}
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* Advanced Fields */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {showAdvanced ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
          {showAdvanced ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/30 md:grid-cols-2 lg:grid-cols-3">
            {renderField('remarks', { label: 'Remarks', type: 'textarea' })}
            
            {/* Custom fields from additionalFields */}
            {Object.entries(formData.additionalFields || {}).map(([key, value]) => {
              if (effectiveSchema.find(sf => sf.key === key)) return null;
              return (
                <div key={key} className="space-y-1.5">
                  <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Info className="mr-2 h-4 w-4 text-slate-400" />
                    {key}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={value as string}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        additionalFields: { ...prev.additionalFields, [key]: e.target.value }
                      }))}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFields = { ...formData.additionalFields };
                        delete newFields[key];
                        setFormData(prev => ({ ...prev, additionalFields: newFields }));
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="col-span-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const key = prompt('Enter field name:');
                  if (key) {
                    setFormData(prev => ({
                      ...prev,
                      additionalFields: { ...prev.additionalFields, [key]: '' }
                    }));
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Field
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
        <div>
          {initialData && (
            <Button variant="outline" type="button" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Asset
            </Button>
          )}
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={isDeleting}>{initialData ? 'Update Asset' : 'Add Asset'}</Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Asset"
        message="Are you sure you want to permanently delete this asset? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {ocrData && (
        <OcrValidationModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          data={ocrData}
          onConfirm={handleOcrConfirm}
        />
      )}
    </form>
  );
};
