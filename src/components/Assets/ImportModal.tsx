import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Settings2,
  Table as TableIcon,
  Plus,
  Trash2,
  Edit2,
  X,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../UI/Button';
import { Asset, AssetCategory, AssetSubcategory, FieldDefinition } from '../../types';
import { cn } from '../../utils/cn';
import { getRowColorClass } from '../../utils/assetUtils';
import { useAssets } from '../../hooks/useAssets';
import { ASSET_SCHEMA, COMMON_FIELDS } from '../../constants/assetSchema';
import { OFFICIAL_DEPARTMENTS } from '../../constants/departments';

interface ImportModalProps {
  onClose: () => void;
}

interface ColumnMapping {
  excelHeader: string;
  mappedField: string; // key in Asset or additionalFields
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  isCustom: boolean;
  ignored: boolean;
  removed?: boolean;
}

interface RowError {
  row: number;
  field: string;
  message: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const { settings, bulkImport, getEffectiveSchema } = useAssets();
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fullData, setFullData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'category' | 'selectSheet' | 'mapping' | 'preview' | 'summary'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('Hardware');
  const [selectedSubcategory, setSelectedSubcategory] = useState<AssetSubcategory>('Others');
  const [importSummary, setImportSummary] = useState<{ success: number, failed: number, errors: RowError[] } | null>(null);
  const [skippedRows, setSkippedRows] = useState<number[]>([]);
  const [rowColors, setRowColors] = useState<Record<number, 'White' | 'Red' | 'Violet' | 'Green'>>({});
  
  const COLOR_OPTIONS: ('White' | 'Red' | 'Violet' | 'Green')[] = ['White', 'Red', 'Violet', 'Green'];
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        
        if (wb.SheetNames.length === 0) throw new Error('File has no sheets');
        
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setStep('category');
        setIsProcessing(false);
      } catch (err) {
        setError('Failed to parse file. Please check the format.');
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSheetSelect = (sheetName: string) => {
    if (!workbook || !sheetName || typeof sheetName !== 'string') return;
    
    setIsProcessing(true);
    setError(null);
    setSelectedSheet(sheetName);

    try {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        setError('Could not find selected sheet.');
        setIsProcessing(false);
        return;
      }

      // Get all rows as array of arrays for robust parsing
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      if (allRows.length === 0) {
        setError('Selected sheet is empty.');
        setIsProcessing(false);
        return;
      }

      // Find the first row that looks like a header
      const headerKeywords = ['name', 'serial', 's/n', 'sl no', 'model', 'ip address', 'system', 'type', 'id', 'asset', 'vendor', 'location', 'sr. no', 's.no'];
      let headerRowIndex = -1;
      
      for (let i = 0; i < Math.min(allRows.length, 50); i++) {
        const row = allRows[i];
        if (!row || !Array.isArray(row)) continue;
        
        const meaningfulCount = row.filter(cell => {
          if (!cell) return false;
          const val = String(cell).toLowerCase().trim();
          return headerKeywords.some(k => val.includes(k));
        }).length;

        if (meaningfulCount >= 2) {
          headerRowIndex = i;
          break;
        }
      }

      // Fallback if no header row detected with keywords
      if (headerRowIndex === -1) {
        headerRowIndex = allRows.findIndex(row => row.some(cell => cell !== ''));
        if (headerRowIndex === -1) headerRowIndex = 0;
      }

      const rawHeaders = allRows[headerRowIndex].map(h => String(h || '').trim());
      // Identify valid headers and their column indices
      const headerMap = rawHeaders
        .map((name, index) => ({ name, index }))
        .filter(h => h.name !== '' && !h.name.startsWith('__EMPTY'));
      
      if (headerMap.length === 0) {
        setError('Selected sheet has no valid headers.');
        setIsProcessing(false);
        return;
      }

      const fileHeaders = headerMap.map(h => h.name);
      
      // Convert data rows to objects using the detected headers
      const dataRows = allRows.slice(headerRowIndex + 1).filter(row => row.some(cell => cell !== ''));
      const jsonData = dataRows.map(row => {
        const obj: any = {};
        headerMap.forEach(h => {
          obj[h.name] = row[h.index] !== undefined ? row[h.index] : '';
        });
        return obj;
      });

      if (jsonData.length === 0) {
        setError('Selected sheet has no valid data rows.');
        setIsProcessing(false);
        return;
      }

      setHeaders(fileHeaders);
      setFullData(jsonData);
      
      // Initialize Mappings immediately using the ALREADY SELECTED subcategory
      const effectiveSchema = getEffectiveSchema(selectedCategory, selectedSubcategory);
      
      const initialMappings: ColumnMapping[] = fileHeaders.map(header => {
        const headerStr = String(header || '');
        const normalizedHeader = headerStr.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        
        // Try to find a match in effective schema
        const match = effectiveSchema.find(f => 
          (f.key && f.key.toLowerCase() === normalizedHeader) || 
          (f.label && f.label.toLowerCase() === headerStr.toLowerCase().trim()) ||
          (f.headers && f.headers.some(h => typeof h === 'string' && h.toLowerCase() === headerStr.toLowerCase().trim()))
        );

        if (match) {
          return {
            excelHeader: headerStr,
            mappedField: match.key,
            label: match.label,
            type: match.type,
            isCustom: false,
            ignored: false
          };
        }

        // Default to custom field if no match
        return {
          excelHeader: headerStr,
          mappedField: headerStr,
          label: headerStr,
          type: 'text',
          isCustom: true,
          ignored: headerStr.startsWith('__EMPTY') || headerStr.toLowerCase().includes('sr. no') || headerStr.toLowerCase().includes('s.no')
        };
      });
      
      setMappings(initialMappings);
      setStep('mapping');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error processing sheet:', err);
      setError('Failed to process selected sheet.');
      setIsProcessing(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '';
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
      }
      return '';
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    return String(val);
  };

  const validateRow = (row: any, rowIndex: number): RowError[] => {
    const errors: RowError[] = [];
    
    // Meaningful identifiers - if any of these are present, the row is considered valid
    const meaningfulKeys = [
      'name', 'sysSlNo', 'systemName', 'model', 'serialNumber', 
      'assetName', 'assignedEmail', 'licenseKey', 'code', 'assetCode',
      'id', 'assetId', 'tag', 'assetTag'
    ];
    
    // Find which mapped fields in this row have values
    const presentFields = mappings
      .filter(m => !m.ignored)
      .filter(m => {
        const val = row[m.excelHeader];
        return val !== undefined && val !== null && String(val).trim() !== '' && String(val).toUpperCase() !== 'NA' && String(val).toUpperCase() !== 'N/A';
      });

    const hasAnyValue = presentFields.length > 0;
    
    const hasMeaningfulIdentifier = presentFields.some(m => {
      const fieldKey = (m.mappedField || '').toLowerCase();
      return (m.mappedField && meaningfulKeys.includes(m.mappedField)) || 
             fieldKey.includes('name') || 
             fieldKey.includes('serial') ||
             fieldKey.includes('slno') ||
             fieldKey.includes('key') ||
             fieldKey.includes('email') ||
             fieldKey.includes('code') ||
             fieldKey.includes('tag') ||
             fieldKey.includes('id');
    });

    if (!hasAnyValue) {
      errors.push({ row: rowIndex + 1, field: 'Row', message: 'Row is completely empty' });
    } else if (!hasMeaningfulIdentifier) {
      // We still mark it as an error but the user can see why. 
      // However, the user said "Only reject rows if: the entire row is empty or every meaningful field is blank"
      // So if it has ANY value, maybe we should allow it?
      // "Only reject rows if: the entire row is empty or every meaningful field is blank"
      // This implies if it has ANY meaningful field, it's NOT rejected.
      // If it has NO meaningful field but has OTHER fields, should it be rejected?
      // User said: "A row should still be considered valid/importable if it has at least one meaningful identifying field... Only reject rows if: the entire row is empty or every meaningful field is blank"
      // This is slightly contradictory if a row has ONLY "Remarks" but no "Name".
      // I'll stick to the "at least one meaningful field" rule for _isValid.
      errors.push({ row: rowIndex + 1, field: 'Row', message: 'No identifying field (Name, Code, Serial, etc.) found' });
    }

    return errors;
  };

  const previewData = useMemo(() => {
    const schemaKey = `${selectedCategory}_${selectedSubcategory}`;
    return fullData.map((item, index) => {
      const errors = validateRow(item, index);
      const mappedItem: any = {
        _rowIndex: index,
        _errors: errors,
        _isValid: errors.length === 0,
        rowColor: 'White' // Default color
      };

      mappings.forEach(m => {
        if (m.ignored || m.removed) return;
        let val = item[m.excelHeader];
        
        if (m.type === 'number') {
          const rawVal = val;
          val = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
          if (val === undefined || val === null || isNaN(val)) {
            // For numbers, if it's truly empty, use "N/A" as requested, 
            // even if it breaks strict number type (it will be handled as string in UI)
            val = "N/A";
          }
        } else if (m.type === 'date') {
          val = formatDate(val);
          if (!val || val === '' || val === 'Invalid Date') {
            val = "N/A";
          }
        } else {
          // Text or other
          val = (val !== undefined && val !== null && String(val).trim() !== '') ? String(val).trim() : "N/A";
          if (val.toUpperCase() === 'NA' || val.toUpperCase() === 'N/A') {
            val = "N/A";
          }
          
          if (m.mappedField === 'department' && val !== 'N/A') {
            val = String(val).trim();
          }
        }
        
        mappedItem[m.mappedField] = val;
      });

      return mappedItem;
    });
  }, [fullData, mappings, selectedSubcategory, settings]);

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const assetsToImport = previewData
        .filter(item => !skippedRows.includes(item._rowIndex) && item._isValid)
        .map(item => {
          const { _rowIndex, _errors, _isValid, ...cleanItem } = item;
          
          const asset: any = {
            ...cleanItem,
            rowColor: rowColors[_rowIndex] || 'White',
            category: selectedCategory,
            subcategory: selectedSubcategory,
            status: 'Active',
            maintenanceHistory: [],
            additionalFields: {},
          };

          // Move custom fields to additionalFields
          mappings.forEach(m => {
            if (!m.ignored && !m.removed && m.isCustom) {
              const val = cleanItem[m.mappedField];
              // Use "N/A" for missing custom fields too
              asset.additionalFields[m.mappedField] = (val !== undefined && val !== null && val !== '') ? val : "N/A";
              delete asset[m.mappedField];
            }
          });

          // Final normalization: ensure NO fields are empty/null/undefined
          Object.keys(asset).forEach(key => {
            if (key === 'additionalFields' || key === 'maintenanceHistory' || key === 'peripheralStatus' || key === 'assignedTo') return;
            if (asset[key] === undefined || asset[key] === null || String(asset[key]).trim() === '') {
              asset[key] = "N/A";
            }
          });

          // Ensure warranty duration if missing
          if (!asset.warrantyDurationMonths) {
            const defaultWarranty = selectedCategory === 'Hardware' 
              ? (settings?.hardwareWarranty?.[selectedSubcategory] || 36)
              : (settings?.softwareWarranty?.[selectedSubcategory] || 12);
            asset.warrantyDurationMonths = defaultWarranty;
          }

          return asset;
        });

      // Prepare new schema if there are custom fields
      const newCustomFields = mappings
        .filter(m => !m.ignored && !m.removed)
        .map(m => ({
          key: m.mappedField,
          label: m.label,
          type: m.type,
          showInTable: true
        }));

      const schemaKey = `${selectedCategory}_${selectedSubcategory}`;
      const existingCustomSchema = settings?.customSchemas?.[schemaKey] || [];
      
      // Identify fields to explicitly exclude (those in the Excel file that were ignored or removed)
      const keysToExclude = mappings
        .filter(m => m.ignored || m.removed)
        .map(m => m.mappedField);
      
      // Union-based schema: keep existing fields that are NOT explicitly excluded in this import, and add new ones
      const combinedSchema = existingCustomSchema.filter(ef => !keysToExclude.includes(ef.key));
      
      newCustomFields.forEach(nf => {
        const existingIdx = combinedSchema.findIndex(ef => ef.key === nf.key);
        if (existingIdx >= 0) {
          // Update existing field (e.g. label or color might have changed)
          combinedSchema[existingIdx] = nf;
        } else {
          // Add new field
          combinedSchema.push(nf);
        }
      });

      await bulkImport(assetsToImport, selectedCategory, selectedSubcategory, combinedSchema);
      
      setImportSummary({
        success: assetsToImport.length,
        failed: fullData.length - assetsToImport.length,
        errors: previewData.flatMap(item => item._errors)
      });
      setStep('summary');
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMappingStep = () => {
    const allKnownFields = getEffectiveSchema(selectedCategory, selectedSubcategory);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Map Excel Columns</h3>
          <Button variant="outline" size="sm" onClick={() => {
            const newHeader = `Custom Field ${mappings.length + 1}`;
            setMappings([...mappings, {
              excelHeader: '',
              mappedField: newHeader,
              label: newHeader,
              type: 'text',
              isCustom: true,
              ignored: false
            }]);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add Column
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Excel Header</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Map To</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {mappings.map((m, idx) => {
                if (m.removed) return null;
                return (
                  <tr key={idx} className={cn(m.ignored && "opacity-50 bg-slate-50 dark:bg-slate-900/50")}>
                    <td className="px-4 py-3">
                      <select
                        value={m.excelHeader}
                        onChange={(e) => {
                          const newMappings = [...mappings];
                          newMappings[idx].excelHeader = e.target.value;
                          setMappings(newMappings);
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="">-- Manual Entry --</option>
                        {headers.map((h, hIdx) => <option key={`${h}-${hIdx}`} value={h}>{h}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col space-y-1">
                        <select
                          value={m.isCustom ? 'custom' : m.mappedField}
                          onChange={(e) => {
                            const newMappings = [...mappings];
                            if (e.target.value === 'custom') {
                              newMappings[idx].isCustom = true;
                              newMappings[idx].mappedField = m.excelHeader || `field_${idx}`;
                              newMappings[idx].label = m.excelHeader || `Field ${idx}`;
                            } else {
                              const field = allKnownFields.find(f => f.key === e.target.value);
                              newMappings[idx].isCustom = false;
                              newMappings[idx].mappedField = field?.key || '';
                              newMappings[idx].label = field?.label || '';
                              newMappings[idx].type = field?.type || 'text';
                            }
                            setMappings(newMappings);
                          }}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <optgroup label="Standard Fields">
                            {allKnownFields.map(f => <option key={`field-${f.key}`} value={f.key}>{f.label}</option>)}
                          </optgroup>
                          <option value="custom">-- Custom Field --</option>
                        </select>
                        {m.isCustom && (
                          <input
                            type="text"
                            value={m.label}
                            onChange={(e) => {
                              const newMappings = [...mappings];
                              newMappings[idx].label = e.target.value;
                              newMappings[idx].mappedField = e.target.value;
                              setMappings(newMappings);
                            }}
                            placeholder="Field Label"
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.type}
                        disabled={!m.isCustom}
                        onChange={(e) => {
                          const newMappings = [...mappings];
                          newMappings[idx].type = e.target.value as any;
                          setMappings(newMappings);
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newMappings = [...mappings];
                            newMappings[idx].ignored = !newMappings[idx].ignored;
                            setMappings(newMappings);
                          }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            m.ignored ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
                          )}
                          title={m.ignored ? "Enable Column" : "Ignore Column"}
                        >
                          {m.ignored ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => {
                            const newMappings = [...mappings];
                            newMappings[idx].removed = true;
                            setMappings(newMappings);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep('selectSheet')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={() => {
              setStep('preview');
            }}
          >
            Preview Data <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSelectSheetStep = () => {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Sheet to Import</h3>
          <p className="text-sm text-slate-500">We detected {sheetNames.length} sheets in your file. Please select one to continue.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => handleSheetSelect(name)}
              className={cn(
                "flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                selectedSheet === name
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-800"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg mr-3 transition-colors",
                selectedSheet === name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
              )}>
                <TableIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-bold truncate",
                  selectedSheet === name ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300"
                )}>{name}</p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 ml-2 transition-transform",
                selectedSheet === name ? "text-indigo-600 translate-x-1" : "text-slate-300"
              )} />
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep('category')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  };

  const renderPreviewStep = () => {
    const activeMappings = mappings.filter(m => !m.ignored && !m.removed);
    const validCount = previewData.filter(d => d._isValid && !skippedRows.includes(d._rowIndex)).length;
    const errorCount = previewData.filter(d => !d._isValid).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span className="text-xs font-bold">{validCount} Ready</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-800">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span className="text-xs font-bold">{errorCount} Errors</span>
              </div>
            )}
            <div className="flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800">
              <Info className="mr-2 h-4 w-4" />
              <span className="text-xs font-bold">Set Row Colours Below</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">Showing first 50 rows</p>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr>
                <th className="px-3 py-2 w-10"></th>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Row Colour</th>
                {activeMappings.map((m, mIdx) => (
                  <th key={`${m.mappedField}-${mIdx}`} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {previewData.slice(0, 50).map((row) => (
                <tr key={row._rowIndex} className={cn(
                  "transition-colors",
                  !row._isValid && "bg-red-50/50 dark:bg-red-900/10",
                  skippedRows.includes(row._rowIndex) && "opacity-40 grayscale",
                  getRowColorClass(rowColors[row._rowIndex])
                )}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!skippedRows.includes(row._rowIndex)}
                      onChange={() => {
                        if (skippedRows.includes(row._rowIndex)) {
                          setSkippedRows(skippedRows.filter(r => r !== row._rowIndex));
                        } else {
                          setSkippedRows([...skippedRows, row._rowIndex]);
                        }
                      }}
                      className="h-3 w-3 rounded text-indigo-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={rowColors[row._rowIndex] || 'White'}
                      onChange={(e) => setRowColors({ ...rowColors, [row._rowIndex]: e.target.value as any })}
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                    >
                      {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  {activeMappings.map((m, mIdx) => (
                    <td key={`${m.mappedField}-${mIdx}`} className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white">{row[m.mappedField]}</span>
                        {row._errors.find((e: RowError) => e.field === m.label) && (
                          <span className="text-[10px] text-red-500 font-medium">
                            {row._errors.find((e: RowError) => e.field === m.label).message}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleImport} loading={isProcessing} disabled={validCount === 0}>
            Confirm Import ({validCount} Assets)
          </Button>
        </div>
      </div>
    );
  };

  const renderSummaryStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
      <div className="rounded-full bg-emerald-100 p-6 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-16 w-16 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Import Successful!</h3>
        <p className="mt-2 text-slate-500">
          Successfully imported {importSummary?.success} assets into <b>{selectedSubcategory}</b>.
        </p>
        {importSummary?.failed && importSummary.failed > 0 && (
          <p className="mt-1 text-amber-600 font-medium">
            {importSummary.failed} rows were skipped due to validation errors.
          </p>
        )}
      </div>
      <Button onClick={onClose} className="px-12">Done</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      {step !== 'summary' && (
        <div className="flex items-center justify-center space-x-4 mb-8">
          {[
            { id: 'upload', icon: Upload, label: 'Upload' },
            { id: 'category', icon: Settings2, label: 'Category' },
            { id: 'selectSheet', icon: TableIcon, label: 'Sheet' },
            { id: 'mapping', icon: TableIcon, label: 'Map' },
            { id: 'preview', icon: Edit2, label: 'Preview' }
          ].map((s, i) => {
            const isActive = step === s.id;
            const isDone = ['upload', 'category', 'selectSheet', 'mapping', 'preview'].indexOf(step) > i;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center space-y-1">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isActive ? "border-indigo-600 bg-indigo-600 text-white" : 
                    isDone ? "border-emerald-500 bg-emerald-500 text-white" : 
                    "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950"
                  )}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </div>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", isActive ? "text-indigo-600" : "text-slate-400")}>
                    {s.label}
                  </span>
                </div>
                {i < 4 && <div className={cn("h-px w-8", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {step === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 transition-all hover:border-indigo-500 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-indigo-500 cursor-pointer"
        >
          <Upload className="mb-4 h-12 w-12 text-slate-400" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">Click to upload Excel file</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Supports .xlsx, .xls, .csv</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>
      )}

      {step !== 'upload' && step !== 'summary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50">
            <div className="flex items-center">
              <FileText className="mr-3 h-6 w-6 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{file?.name}</p>
                <p className="text-xs text-slate-500">{(file?.size || 0 / 1024).toFixed(2)} KB • {fullData.length} rows detected</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setStep('upload'); }}>Change</Button>
          </div>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-4 text-sm text-slate-500">Processing...</p>
            </div>
          ) : error ? (
            <div className="flex items-center rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mr-3 h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              {step === 'category' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Select Category</label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['Hardware', 'Software', 'E-Waste'] as AssetCategory[]).map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedSubcategory(cat === 'Hardware' ? 'Others' : cat === 'Software' ? 'Gmail' : 'Others');
                          }}
                          className={cn(
                            "flex items-center justify-center rounded-xl border-2 p-4 transition-all",
                            selectedCategory === cat 
                              ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm" 
                              : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 dark:bg-slate-950 dark:border-slate-800"
                          )}
                        >
                          <span className="text-sm font-bold">{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Select Subcategory</label>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value as AssetSubcategory)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:bg-slate-950 dark:border-slate-800"
                    >
                      {selectedCategory === 'Hardware' ? (
                        ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                      ) : selectedCategory === 'Software' ? (
                        ['Gmail', 'AutoCAD', 'Adobe Acrobat', 'Microsoft Office', 'SAP'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                      ) : (
                        <option value="Others">Others</option>
                      )}
                    </select>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep('selectSheet')} className="w-full sm:w-auto">
                      Next: Select Sheet <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {step === 'selectSheet' && renderSelectSheetStep()}
              {step === 'mapping' && renderMappingStep()}
              {step === 'preview' && renderPreviewStep()}
            </>
          )}
        </div>
      )}

      {step === 'summary' && renderSummaryStep()}
    </div>
  );
};
