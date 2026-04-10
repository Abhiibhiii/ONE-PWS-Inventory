import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { AssetForm } from '../components/Assets/AssetForm';
import { ImportModal } from '../components/Assets/ImportModal';
import { AssetDetailsModal } from '../components/Assets/AssetDetailsModal';
import { Search, Plus, Filter, Download, Upload, MoreVertical, Trash2, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, FileDown, UserPlus, Activity, RotateCcw, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, AssetCategory, AssetSubcategory, AssetStatus, FieldDefinition } from '../types';
import { ASSET_SCHEMA, COMMON_FIELDS } from '../constants/assetSchema';
import { OFFICIAL_DEPARTMENTS } from '../constants/departments';
import { isAfter, isBefore, parseISO, startOfDay, endOfDay, addDays, isWithinInterval, format } from 'date-fns';
import { cn } from '../utils/cn';
import { getColumnColorClass, getRowColorClass, getAssetValue } from '../utils/assetUtils';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { LoadingSpinner } from '../components/UI/LoadingSpinner';

interface AssetsPageProps {
  onAssetClick?: (id: string) => void;
  initialAction?: 'import';
}

export const AssetsPage: React.FC<AssetsPageProps> = ({ onAssetClick, initialAction }) => {
  const { assets, addAsset, updateAsset, deleteAsset, updateSchema, recoverSchema, bulkImport, bulkDelete, bulkUpdateStatus, updateColumnWidths, updateColumnOrder, getWarrantyStatus, getEffectiveSchema, settings, isLoading } = useAssets();
  const { user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading assets..." />;
  }
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin' || isSuperAdmin;
  const isViewer = user?.role === 'Viewer';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'All'>('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState<AssetSubcategory | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'All'>('All');
  const [warrantyFilter, setWarrantyFilter] = useState<'All' | 'In Warranty' | 'Expiring' | 'Expired' | 'No Data'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [vendorFilter, setVendorFilter] = useState<string>('All');
  const [rowColorFilter, setRowColorFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'name',
    direction: 'asc'
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  React.useEffect(() => {
    if (initialAction === 'import') {
      setIsImportModalOpen(true);
    }
  }, [initialAction]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(key);
    setStartX(e.pageX);
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
      setStartWidth(th.offsetWidth);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;
      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      
      const ths = document.querySelectorAll('th');
      ths.forEach(th => {
        if (th.getAttribute('data-key') === resizingColumn) {
          (th as HTMLElement).style.width = `${newWidth}px`;
          (th as HTMLElement).style.minWidth = `${newWidth}px`;
        }
      });
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        const th = document.querySelector(`th[data-key="${resizingColumn}"]`) as HTMLElement;
        if (th) {
          const finalWidth = th.offsetWidth;
          updateColumnWidths(categoryFilter, subcategoryFilter, { [resizingColumn]: finalWidth });
        }
        setResizingColumn(null);
      }
    };

    if (resizingColumn) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth, categoryFilter, subcategoryFilter, updateColumnWidths]);

  useEffect(() => {
    setDepartmentFilter('All');
    setLocationFilter('All');
    setVendorFilter('All');
    setRowColorFilter('All');
    setStatusFilter('All');
    setWarrantyFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, [categoryFilter, subcategoryFilter]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        return null; // Reset to unsorted
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedAssets = useMemo(() => {
    let result = assets.filter(a => {
      const searchLower = (search || '').toLowerCase();
      const matchesSearch = (getAssetValue(a, 'name') || '').toLowerCase().includes(searchLower) || 
                           (getAssetValue(a, 'sysSlNo') || '').toLowerCase().includes(searchLower) ||
                           (getAssetValue(a, 'model') || '').toLowerCase().includes(searchLower) ||
                           (getAssetValue(a, 'systemName') || '').toLowerCase().includes(searchLower);
      const matchesCategory = categoryFilter === 'All' || 
                             String(a.category || '').toLowerCase() === String(categoryFilter).toLowerCase() || 
                             (categoryFilter === 'E-Waste' && (a.status === 'E-Waste' || a.status === 'Move to E-Waste'));
      
      const matchesSubcategory = subcategoryFilter === 'All' || 
                                (subcategoryFilter === 'Vacant Systems (IT Stock)' 
                                  ? a.status === 'In IT Stock' 
                                  : String(a.subcategory || '').trim().toLowerCase() === String(subcategoryFilter).trim().toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      
      const matchesDepartment = departmentFilter === 'All' || 
                               String(a.department || '').trim().toLowerCase() === String(departmentFilter).trim().toLowerCase();
      
      const matchesLocation = locationFilter === 'All' || 
                             String(a.location || '').trim().toLowerCase() === String(locationFilter).trim().toLowerCase();
      
      const matchesVendor = vendorFilter === 'All' || 
                           String(a.vendor || '').trim().toLowerCase() === String(vendorFilter).trim().toLowerCase();
      
      const matchesRowColor = rowColorFilter === 'All' || (a.rowColor || 'White') === rowColorFilter;
      
      let matchesWarranty = true;
      if (warrantyFilter !== 'All') {
        const { status } = getWarrantyStatus(a);
        if (warrantyFilter !== status) matchesWarranty = false;
      }

      let matchesDate = true;
      if (startDate || endDate) {
        if (!a.invoiceDate) {
          matchesDate = false;
        } else {
          try {
            const pDate = parseISO(a.invoiceDate);
            if (isNaN(pDate.getTime())) {
              matchesDate = false;
            } else {
              if (startDate) {
                const sDate = parseISO(startDate);
                if (!isNaN(sDate.getTime()) && isBefore(pDate, startOfDay(sDate))) matchesDate = false;
              }
              if (endDate) {
                const eDate = parseISO(endDate);
                if (!isNaN(eDate.getTime()) && isAfter(pDate, endOfDay(eDate))) matchesDate = false;
              }
            }
          } catch (e) {
            matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus && matchesWarranty && matchesDate && matchesDepartment && matchesLocation && matchesVendor && matchesRowColor;
    });

    if (sortConfig) {
      const assetIndexMap = new Map<string, number>(assets.map((a, i) => [a.id, i]));

      result.sort((a, b) => {
        const { key, direction } = sortConfig;
        
        // Special case for S.NO (row index) - sort by original order
        if (key === 'sno') {
          const aVal = assetIndexMap.get(a.id) ?? 0;
          const bVal = assetIndexMap.get(b.id) ?? 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        let aValue: any = getAssetValue(a, key);
        let bValue: any = getAssetValue(b, key);

        // Normalize for comparison
        const aStr = String(aValue ?? '').trim();
        const bStr = String(bValue ?? '').trim();

        // Handle N/A and empty values - always at the end
        const isAEmpty = aStr === '' || aStr === 'N/A';
        const isBEmpty = bStr === '' || bStr === 'N/A';

        if (isAEmpty && isBEmpty) return 0;
        if (isAEmpty) return 1;
        if (isBEmpty) return -1;

        // Try numeric comparison first
        const aNum = parseFloat(aStr.replace(/,/g, ''));
        const bNum = parseFloat(bStr.replace(/,/g, ''));
        
        // Check if it's a valid number and the whole string is numeric (to avoid sorting "123-ABC" as number)
        const isANumeric = !isNaN(aNum) && /^-?\d*\.?\d+$/.test(aStr.replace(/,/g, ''));
        const isBNumeric = !isNaN(bNum) && /^-?\d*\.?\d+$/.test(bStr.replace(/,/g, ''));

        if (isANumeric && isBNumeric) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // IP Address sorting
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(aStr) && ipRegex.test(bStr)) {
          const aOctets = aStr.split('.').map(Number);
          const bOctets = bStr.split('.').map(Number);
          for (let i = 0; i < 4; i++) {
            if (aOctets[i] !== bOctets[i]) {
              return direction === 'asc' ? aOctets[i] - bOctets[i] : bOctets[i] - aOctets[i];
            }
          }
          return 0;
        }

        // Date sorting
        const aDate = parseISO(aStr);
        const bDate = parseISO(bStr);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime()) && aStr.includes('-') && bStr.includes('-')) {
          return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }

        // Default: Natural sort
        return direction === 'asc'
          ? aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
          : bStr.localeCompare(aStr, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return result;
  }, [
    assets, 
    search, 
    categoryFilter, 
    subcategoryFilter, 
    statusFilter, 
    departmentFilter, 
    locationFilter, 
    vendorFilter, 
    warrantyFilter, 
    startDate, 
    endDate, 
    sortConfig,
    getWarrantyStatus,
    rowColorFilter
  ]);

  const totalPages = Math.ceil(filteredAndSortedAssets.length / itemsPerPage);
  const paginatedAssets = filteredAndSortedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleBulkEWaste = async () => {
    if (selectedAssetIds.length === 0) return;
    setIsDeleting(true);
    try {
      await bulkUpdateStatus(selectedAssetIds, 'E-Waste');
      setSelectedAssetIds([]);
      toast.success(`Moved ${selectedAssetIds.length} assets to E-Waste`);
    } finally {
      setIsDeleting(false);
    }
  };

  const categories: (AssetCategory | 'All')[] = ['All', 'Hardware', 'Software', 'E-Waste'];
  const subcategories = useMemo(() => {
    if (categoryFilter === 'All') return ['All'];
    if (categoryFilter === 'Hardware') return ['All', 'System', 'Vacant Systems (IT Stock)', 'Printer', 'Laptop', 'Networking', 'Display', 'Others'];
    if (categoryFilter === 'Software') return ['All', 'Mail', 'AutoCAD', 'Adobe Acrobat', 'Microsoft Office', 'SAP', 'Password Sheet', 'Master Sheet', 'Project'];
    if (categoryFilter === 'E-Waste') return ['All'];
    return ['All'];
  }, [categoryFilter]);

  const statuses: (AssetStatus | 'All')[] = ['All', 'Active', 'In Repair', 'Replaced', 'Move to E-Waste', 'E-Waste', 'Inactive', 'In IT Stock'];
  const warrantyFilters = ['All', 'In Warranty', 'Expiring', 'Expired', 'No Data'];
  const rowColorFilters = ['All', 'White', 'Red', 'Violet', 'Green'];

  const departments = useMemo(() => {
    const filteredAssets = assets.filter(a => {
      const catMatch = categoryFilter === 'All' || 
                       String(a.category || '').toLowerCase() === String(categoryFilter).toLowerCase();
      const subMatch = subcategoryFilter === 'All' || 
                       String(a.subcategory || '').trim().toLowerCase() === String(subcategoryFilter).trim().toLowerCase();
      return catMatch && subMatch;
    });
    
    const depts = new Set<string>();
    filteredAssets.forEach(a => {
      const dept = String(a.department || '').trim();
      if (dept && dept !== 'N/A') {
        depts.add(dept);
      }
    });
    
    return ['All', ...Array.from(depts).sort((a, b) => a.localeCompare(b))];
  }, [assets, categoryFilter, subcategoryFilter]);

  const locations = useMemo(() => {
    const filteredAssets = assets.filter(a => {
      const catMatch = categoryFilter === 'All' || 
                       String(a.category || '').toLowerCase() === String(categoryFilter).toLowerCase();
      const subMatch = subcategoryFilter === 'All' || 
                       String(a.subcategory || '').trim().toLowerCase() === String(subcategoryFilter).trim().toLowerCase();
      return catMatch && subMatch;
    });
    
    const locs = new Set<string>();
    filteredAssets.forEach(a => {
      const loc = String(a.location || '').trim();
      if (loc && loc !== 'N/A') {
        locs.add(loc);
      }
    });
    
    return ['All', ...Array.from(locs).sort((a, b) => a.localeCompare(b))];
  }, [assets, categoryFilter, subcategoryFilter]);

  const vendors = useMemo(() => {
    const filteredAssets = assets.filter(a => {
      const catMatch = categoryFilter === 'All' || 
                       String(a.category || '').toLowerCase() === String(categoryFilter).toLowerCase();
      const subMatch = subcategoryFilter === 'All' || 
                       String(a.subcategory || '').trim().toLowerCase() === String(subcategoryFilter).trim().toLowerCase();
      return catMatch && subMatch;
    });
    
    const vSet = new Set<string>();
    filteredAssets.forEach(a => {
      const v = String(a.vendor || '').trim();
      if (v && v !== 'N/A') {
        vSet.add(v);
      }
    });
    
    return ['All', ...Array.from(vSet).sort((a, b) => a.localeCompare(b))];
  }, [assets, categoryFilter, subcategoryFilter]);

  const effectiveSchema = useMemo(() => 
    getEffectiveSchema(categoryFilter, subcategoryFilter),
    [getEffectiveSchema, categoryFilter, subcategoryFilter]
  );

  const [isColumnDeleteConfirmOpen, setIsColumnDeleteConfirmOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const handleRemoveField = (fieldKey: string) => {
    setColumnToDelete(fieldKey);
    setIsColumnDeleteConfirmOpen(true);
  };

  const confirmColumnDelete = async () => {
    if (!columnToDelete || categoryFilter === 'All' || subcategoryFilter === 'All') return;
    const updatedSchema = effectiveSchema.filter(f => f.key !== columnToDelete);
    await updateSchema(categoryFilter, subcategoryFilter, updatedSchema);
    setIsColumnDeleteConfirmOpen(false);
    setColumnToDelete(null);
    toast.success('Column removed successfully');
  };

  const handleRenameField = async (fieldKey: string, newLabel: string) => {
    if (categoryFilter === 'All' || subcategoryFilter === 'All') return;
    const updatedSchema = effectiveSchema.map(f => 
      f.key === fieldKey ? { ...f, label: newLabel } : f
    );
    await updateSchema(categoryFilter, subcategoryFilter, updatedSchema);
  };

  const handleAddField = async () => {
    if (!newFieldName.trim() || categoryFilter === 'All' || subcategoryFilter === 'All') return;
    const fieldKey = newFieldName.toLowerCase().replace(/\s+/g, '_');
    
    if (effectiveSchema.find(f => f.key === fieldKey)) {
      toast.error('Column already exists');
      return;
    }

    const newField = {
      key: fieldKey,
      label: newFieldName,
      type: 'text' as const,
      showInTable: true,
      isManual: true
    };

    await updateSchema(categoryFilter, subcategoryFilter, [...effectiveSchema, newField]);
    setNewFieldName('');
    toast.success('Column added successfully');
  };

  const isColumnEmpty = useCallback((key: string) => {
    if (categoryFilter === 'All' || subcategoryFilter === 'All') return false;
    if (filteredAndSortedAssets.length === 0) return false;

    const universalKeys = ['selection', 'sno', 'status', 'warranty', 'actions', 'category', 'subcategory'];
    if (universalKeys.includes(key)) return false;

    return filteredAndSortedAssets.every(asset => {
      const value = asset[key as keyof Asset] ?? asset.additionalFields?.[key];
      const stringVal = String(value ?? '').trim();
      return stringVal === '' || stringVal === 'N/A';
    });
  }, [filteredAndSortedAssets, categoryFilter, subcategoryFilter]);

  const getColumns = (): { key: string; label: string }[] => {
    const isSubcategoryView = subcategoryFilter !== 'All' && categoryFilter !== 'All';

    const selectionCol = isAdmin ? [{ key: 'selection', label: '' }] : [];
    const snoCol = [{ key: 'sno', label: 'S.NO' }];
    const actionsCol = [{ key: 'actions', label: 'ACTIONS' }];
    const statusCol = [{ key: 'status', label: 'STATUS' }];
    const warrantyCol = [{ key: 'warranty', label: 'WARRANTY STATUS' }];

    let cols: { key: string; label: string }[] = [];

    if (isSubcategoryView) {
      const schemaKey = `${categoryFilter}_${subcategoryFilter}`;
      const isCustomized = !!settings?.customSchemas?.[schemaKey];
      
      const dynamicCols = effectiveSchema
        .filter(f => isCustomized || !isColumnEmpty(f.key))
        .map(f => ({ 
          key: f.key, 
          label: f.label.toUpperCase()
        }));
      
      cols = [...selectionCol, ...snoCol, ...dynamicCols, ...statusCol, ...warrantyCol, ...actionsCol];
    } else {
      const baseColumns = [
        ...selectionCol,
        ...snoCol,
        { key: 'name', label: 'NAME' },
        { key: 'sysSlNo', label: 'SERIAL NO.' },
        { key: 'model', label: 'MODEL' },
      ];

      if (categoryFilter !== 'All') {
        cols = [
          ...baseColumns,
          { key: 'subcategory', label: 'TYPE' },
          ...statusCol,
          ...warrantyCol,
          ...actionsCol,
        ];
      } else {
        cols = [
          ...baseColumns,
          { key: 'category', label: 'CATEGORY' },
          { key: 'subcategory', label: 'TYPE' },
          ...statusCol,
          ...warrantyCol,
          ...actionsCol,
        ];
      }
    }

    // Deduplicate
    const uniqueCols: { key: string; label: string }[] = [];
    const seenKeys = new Set<string>();
    cols.forEach(col => {
      if (!seenKeys.has(col.key)) {
        uniqueCols.push(col);
        seenKeys.add(col.key);
      }
    });

    // Apply saved column order if available
    const schemaKey = `${categoryFilter}_${subcategoryFilter}`;
    const savedOrder = settings?.columnOrders?.[schemaKey];
    
    if (savedOrder && savedOrder.length > 0) {
      const orderedCols: { key: string; label: string }[] = [];
      
      // First, add columns in the saved order if they exist in current cols
      savedOrder.forEach(key => {
        const col = uniqueCols.find(c => c.key === key);
        if (col) {
          orderedCols.push(col);
        }
      });
      
      // Then, add any new columns that weren't in the saved order
      uniqueCols.forEach(col => {
        if (!orderedCols.find(c => c.key === col.key)) {
          orderedCols.push(col);
        }
      });
      
      return orderedCols;
    }

    return uniqueCols;
  };

  const columns = getColumns();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const newOrder = items.map(col => col.key);
    updateColumnOrder(categoryFilter, subcategoryFilter, newOrder);
  };

  const handleAddAsset = (data: Omit<Asset, 'id'>) => {
    addAsset(data);
    setIsAddModalOpen(false);
  };

  const handleUpdateAsset = (data: Omit<Asset, 'id'>) => {
    if (editingAsset) {
      updateAsset(editingAsset.id, data);
      setEditingAsset(null);
    }
  };

  const handleImport = async (newAssets: Asset[]) => {
    await bulkImport(newAssets);
    setIsImportModalOpen(false);
  };

  const handleDeleteAsset = (id: string) => {
    setAssetToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAsset(assetToDelete);
      setIsDeleteConfirmOpen(false);
      setAssetToDelete(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedAssetIds.length === 0) {
      alert('Please select at least one asset to delete.');
      return;
    }
    setIsBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDelete(selectedAssetIds);
      setSelectedAssetIds([]);
      setIsBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.length === filteredAndSortedAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAndSortedAssets.map(a => a.id));
    }
  };

  const toggleSelectAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async (id: string, status: AssetStatus, peripheralStatus?: Record<string, string>) => {
    await updateAsset(id, { status, peripheralStatus });
    setViewingAsset(null);
  };

  const handleExport = () => {
    const exportColumns = columns.filter(col => col.key !== 'selection' && col.key !== 'actions');
    const headers = exportColumns.map(col => col.label);
    
    const data = filteredAndSortedAssets.map((asset, index) => {
      const row: Record<string, any> = {};
      exportColumns.forEach(col => {
        if (col.key === 'sno') {
          row[col.label] = index + 1;
        } else if (col.key === 'warranty') {
          const { status } = getWarrantyStatus(asset);
          const labelMap = {
            'In Warranty': 'In Warranty',
            'Expiring': 'Expiring',
            'Expired': 'Expired',
            'No Data': 'No Data'
          };
          row[col.label] = labelMap[status];
        } else {
          const value = getAssetValue(asset, col.key);
          
          // Password masking for viewers
          if (asset.subcategory === 'Password Sheet' && isViewer && (col.key === 'password' || col.key.toLowerCase().includes('password'))) {
            row[col.label] = '********';
          } else {
            row[col.label] = (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'na') 
              ? 'N/A' 
              : (typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        }
      });
      return row;
    });

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets");
      XLSX.writeFile(wb, `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Asset Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage and track your organization's hardware assets.</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={handleBulkEWaste} 
              disabled={selectedAssetIds.length === 0}
              className={cn(
                "text-amber-600 border-amber-200 hover:bg-amber-50",
                selectedAssetIds.length === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Move to E-Waste ({selectedAssetIds.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBulkDelete} 
              disabled={selectedAssetIds.length === 0}
              className={cn(
                "text-red-500 border-red-200 hover:bg-red-50",
                selectedAssetIds.length === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedAssetIds.length})
            </Button>
            <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            {categoryFilter !== 'All' && subcategoryFilter !== 'All' && (
              <Button 
                variant="outline" 
                onClick={() => setIsSchemaModalOpen(true)}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Filter className="mr-2 h-4 w-4" /> Manage Columns
              </Button>
            )}
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setSubcategoryFilter('All');
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                categoryFilter === cat
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {categoryFilter !== 'All' && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubcategoryFilter(sub as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap",
                  subcategoryFilter === sub
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                )}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-x-4 lg:space-y-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, serial, or model..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-500">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-500">Warranty:</span>
                  <select
                    value={warrantyFilter}
                    onChange={e => setWarrantyFilter(e.target.value as any)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {warrantyFilters.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                {effectiveSchema.find(f => f.key === 'department') && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-500">Dept:</span>
                    <select
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {effectiveSchema.find(f => f.key === 'location') && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-500">Location:</span>
                    <select
                      value={locationFilter}
                      onChange={e => setLocationFilter(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                )}
                {effectiveSchema.find(f => f.key === 'vendor') && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-500">Vendor:</span>
                    <select
                      value={vendorFilter}
                      onChange={e => setVendorFilter(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-500">Color:</span>
                  <select
                    value={rowColorFilter}
                    onChange={e => setRowColorFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {rowColorFilters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500">Purchase Date Range:</span>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              {(startDate || endDate || departmentFilter !== 'All' || locationFilter !== 'All' || vendorFilter !== 'All' || rowColorFilter !== 'All') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { 
                    setStartDate(''); 
                    setEndDate(''); 
                    setDepartmentFilter('All');
                    setLocationFilter('All');
                    setVendorFilter('All');
                    setRowColorFilter('All');
                  }} 
                  className="h-8 text-xs text-red-500"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <table className="w-full text-left text-sm">
              <Droppable droppableId="columns" direction="horizontal">
                {(provided) => (
                  <thead 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
                  >
                    <tr>
                      {columns.map((col, index) => {
                        const schemaKey = `${categoryFilter}_${subcategoryFilter}`;
                        const savedWidth = settings?.columnWidths?.[schemaKey]?.[col.key];
                        
                        const DraggableComponent = Draggable as any;

                        return (
                          <DraggableComponent key={col.key} draggableId={col.key} index={index}>
                            {(provided: any, snapshot: any) => (
                              <th
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                data-key={col.key}
                                style={{ 
                                  ...provided.draggableProps.style,
                                  width: savedWidth ? `${savedWidth}px` : 'auto',
                                  minWidth: savedWidth ? `${savedWidth}px` : 'auto'
                                } as React.CSSProperties}
                                className={cn(
                                  "group relative px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap",
                                  snapshot.isDragging && "bg-white shadow-xl z-50 dark:bg-slate-900"
                                )}
                                onClick={() => {
                                  if (col.key === 'selection') {
                                    toggleSelectAll();
                                    return;
                                  }
                                  if (col.key !== 'actions' && !col.key.includes('Warranty')) {
                                    handleSort(col.key);
                                  }
                                }}
                              >
                                <div className="flex items-center">
                                  {col.key !== 'selection' && col.key !== 'actions' && (
                                    <div className="mr-1.5 text-slate-300 hover:text-indigo-500">
                                      <GripVertical className="h-3 w-3" />
                                    </div>
                                  )}
                                  {col.key === 'selection' ? (
                                    <div className="flex items-center space-x-2">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAndSortedAssets.length}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleSelectAll();
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className="text-[9px] font-bold">ALL</span>
                                    </div>
                                  ) : (
                                    <>
                                      {col.label}
                                      {sortConfig?.key === col.key && (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                                      )}
                                      {sortConfig?.key !== col.key && col.key !== 'actions' && !col.key.includes('Warranty') && col.key !== 'selection' && (
                                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                      )}
                                    </>
                                  )}
                                </div>
                                {col.key !== 'selection' && col.key !== 'actions' && (
                                  <div
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                                  />
                                )}
                              </th>
                            )}
                          </DraggableComponent>
                        );
                      })}
                      {provided.placeholder}
                    </tr>
                  </thead>
                )}
              </Droppable>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {paginatedAssets.map((asset, index) => (
                  <motion.tr
                    key={asset.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onAssetClick?.(asset.id)}
                    className={cn(
                      "group transition-colors",
                      (onAssetClick || isAdmin) && "cursor-pointer",
                      selectedAssetIds.includes(asset.id) ? "!bg-indigo-50/50 dark:!bg-indigo-900/10" : getRowColorClass(asset.rowColor)
                    )}
                  >
                    {columns.map((col) => {
                      if (col.key === 'selection') {
                        return (
                          <td key={col.key} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedAssetIds.includes(asset.id)}
                              onChange={(e) => {
                                setSelectedAssetIds(prev => 
                                  prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id]
                                );
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        );
                      }
                      if (col.key === 'sno') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {((currentPage - 1) * itemsPerPage) + index + 1}
                          </td>
                        );
                      }
                      if (col.key === 'warranty') {
                        const { status, expiryDate } = getWarrantyStatus(asset);
                        const labelMap = {
                          'In Warranty': 'In Warranty',
                          'Expiring': 'Expiring',
                          'Expired': 'Expired',
                          'No Data': 'No Data'
                        };
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <div className="flex flex-col space-y-1">
                              <Badge status={status} label={labelMap[status]} />
                              {expiryDate && (
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                  • {format(expiryDate, 'dd MMM yyyy')}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }
                      if (col.key === 'status' || col.key === 'category' || col.key === 'subcategory') {
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <Badge status={asset[col.key as keyof Asset] as string} />
                          </td>
                        );
                      }
                      if (col.key === 'actions') {
                        return (
                          <td key={col.key} className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-2 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingAsset(asset);
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAsset(asset);
                                    }}
                                    title="Edit Asset"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAsset(asset.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                    title="Delete Asset"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const value = getAssetValue(asset, col.key);
                      let displayValue = (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'na') 
                        ? 'N/A' 
                        : (typeof value === 'object' ? JSON.stringify(value) : String(value));

                      // Password masking for viewers
                      if (asset.subcategory === 'Password Sheet' && isViewer && (col.key === 'password' || col.key.toLowerCase().includes('password'))) {
                        displayValue = '********';
                      }

                      return (
                        <td key={col.key} className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {displayValue}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          </DragDropContext>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedAssets.length)}</span> of{' '}
            <span className="font-medium">{filteredAndSortedAssets.length}</span> assets
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Assets"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Export Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExportFormat('excel')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                  exportFormat === 'excel'
                    ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                )}
              >
                <FileDown className="h-8 w-8 mb-2" />
                <span className="font-bold">Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                  exportFormat === 'csv'
                    ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                )}
              >
                <Download className="h-8 w-8 mb-2" />
                <span className="font-bold">CSV (.csv)</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Export Summary</h4>
            <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
              <li>• Category: <span className="font-semibold text-slate-900 dark:text-white">{categoryFilter}</span></li>
              <li>• Subcategory: <span className="font-semibold text-slate-900 dark:text-white">{subcategoryFilter}</span></li>
              <li>• Total Assets: <span className="font-semibold text-slate-900 dark:text-white">{filteredAndSortedAssets.length}</span></li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Start Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Asset"
        size="lg"
      >
        <AssetForm 
          onSubmit={handleAddAsset} 
          onCancel={() => setIsAddModalOpen(false)} 
          departments={departments}
        />
      </Modal>

      <Modal
        isOpen={!!viewingAsset}
        onClose={() => setViewingAsset(null)}
        title="Asset Details & Status Control"
        size="lg"
      >
        {viewingAsset && (
          <AssetDetailsModal
            asset={assets.find(a => a.id === viewingAsset.id) || viewingAsset}
            onUpdateStatus={handleUpdateStatus}
            onClose={() => setViewingAsset(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        title="Edit Asset"
        size="lg"
      >
        {editingAsset && (
          <AssetForm
            initialData={editingAsset}
            onSubmit={handleUpdateAsset}
            onCancel={() => setEditingAsset(null)}
            departments={departments}
          />
        )}
      </Modal>

      <Modal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        title={`Manage Columns: ${categoryFilter} → ${subcategoryFilter}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Active Columns</h4>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => recoverSchema(categoryFilter, subcategoryFilter)}
                  className="text-indigo-600 hover:text-indigo-700 h-8 text-xs font-bold"
                >
                  <Activity className="mr-1.5 h-3 w-3" /> Recover Missing Columns
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => updateColumnWidths(categoryFilter, subcategoryFilter, null)}
                  className="text-amber-600 hover:text-amber-700 h-8 text-xs font-bold ml-2"
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" /> Reset Widths
                </Button>
              </div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
              {(() => {
                const schemaKey = `${categoryFilter}_${subcategoryFilter}`;
                const customSchema = settings?.customSchemas?.[schemaKey] || [];
                
                // Get all columns from effective schema
                const currentCols = effectiveSchema;
                
                return currentCols.map(col => {
                  const savedWidth = settings?.columnWidths?.[schemaKey]?.[col.key];

                  return (
                    <div key={col.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex-1 mr-4">
                        <input 
                          type="text"
                          value={col.label}
                          onChange={(e) => handleRenameField(col.key, e.target.value)}
                          className="text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 w-full"
                        />
                        <p className="text-[10px] text-slate-500 font-mono">{col.key}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400">Width:</span>
                          <input 
                            type="number"
                            value={savedWidth || 150}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                updateColumnWidths(categoryFilter, subcategoryFilter, { [col.key]: val });
                              }
                            }}
                            className="w-16 h-7 rounded border border-slate-200 bg-white px-1.5 text-[10px] focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                        <button 
                          onClick={() => handleRemoveField(col.key)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove Column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Add New Column</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Column Name (e.g. Rack No)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <Button onClick={handleAddField}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * New columns will be available for all assets in this subcategory.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsSchemaModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Assets"
        size="xl"
      >
        <ImportModal onClose={() => setIsImportModalOpen(false)} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Asset"
        message="Are you sure you want to delete this asset? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Assets"
        message={`Are you sure you want to delete ${selectedAssetIds.length} selected assets? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        isLoading={isDeleting}
      />
      {/* Column Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isColumnDeleteConfirmOpen}
        onClose={() => setIsColumnDeleteConfirmOpen(false)}
        onConfirm={confirmColumnDelete}
        title="Delete Column"
        message={`Are you sure you want to permanently delete the column "${columnToDelete}"? This will remove it from all views for this subcategory.`}
        confirmText="Delete Column"
        variant="danger"
      />
    </div>
  );
};
