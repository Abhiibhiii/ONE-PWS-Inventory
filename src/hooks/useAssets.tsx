import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Asset, Activity, MaintenanceRecord, GlobalSettings, AssetCategory, AssetSubcategory, AssetStatus, AssetHistory, FieldDefinition, GatePass, UserRole } from '../types';
import { ASSET_SCHEMA, COMMON_FIELDS } from '../constants/assetSchema';
import { isWithinInterval, addDays, addMonths, parseISO, parse, isValid } from 'date-fns';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  serverTimestamp,
  getDocs,
  setDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { useAuth } from './useAuth';
import { getAssetValue } from '../utils/assetUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AssetContextType {
  assets: Asset[];
  activities: Activity[];
  gatePasses: GatePass[];
  settings: GlobalSettings | null;
  addAsset: (asset: Omit<Asset, 'id' | 'uid'>) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  updateSchema: (category: string, subcategory: string, schema: FieldDefinition[]) => Promise<void>;
  recoverSchema: (category: string, subcategory: string) => Promise<void>;
  bulkImport: (newAssets: Omit<Asset, 'id' | 'uid'>[], category?: string, subcategory?: string, newSchema?: FieldDefinition[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: AssetStatus) => Promise<void>;
  bulkUpdateWarranty: (category: AssetCategory, subcategory: string, duration: number) => Promise<void>;
  assignAsset: (assetId: string, user: { userId: string, name: string, email?: string } | null) => Promise<void>;
  addGatePass: (assetId: string, gatePass: Omit<GatePass, 'id' | 'createdAt'>) => Promise<void>;
  updateGatePass: (assetId: string, gatePassId: string, gatePass: Partial<GatePass>) => Promise<void>;
  deleteGatePass: (assetId: string, gatePassId: string) => Promise<void>;
  updateSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
  updateColumnWidths: (category: string, subcategory: string, widths: Record<string, number>) => Promise<void>;
  updateColumnOrder: (category: string, subcategory: string, order: string[]) => Promise<void>;
  getAssetById: (id: string) => Asset | undefined;
  getAssetHistory: (assetId: string) => Promise<AssetHistory[]>;
  getMaintenanceRecords: (assetId: string) => Promise<MaintenanceRecord[]>;
  addMaintenanceRecord: (assetId: string, record: Omit<MaintenanceRecord, 'id' | 'assetId' | 'uid'>) => Promise<void>;
  getWarrantyStatus: (asset: Asset) => { status: 'In Warranty' | 'Expiring' | 'Expired' | 'No Data'; expiryDate: Date | null };
  getEffectiveSchema: (category: string, subcategory: string) => FieldDefinition[];
  getFinancialYearStats: (year: number) => { added: number; repaired: number; ewaste: number };
  stats: {
    hardware: {
      total: number;
      active: number;
      inRepair: number;
      retired: number;
      replaced: number;
      ewaste: number;
      itStock: number;
      bySubcategory: Record<string, number>;
    };
    software: {
      total: number;
      active: number;
      inactive: number;
      bySubcategory: Record<string, number>;
    };
    warranty: {
      active: number;
      expiring: number;
      expired: number;
      noData: number;
    };
  };
  vendors: string[];
  isLoading: boolean;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady || !user) {
      setAssets([]);
      setSettings(null);
      setIsLoading(false);
      return;
    }

    const assetsPath = 'assets';
    const assetsQuery = query(collection(db, assetsPath));
    
    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      const assetList: Asset[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let category = data.category;
        let subcategory = data.subcategory;

        // Normalize old categories
        if (category === 'Systems') {
          category = 'Hardware';
          subcategory = 'System';
        } else if (category === 'Printers') {
          category = 'Hardware';
          subcategory = 'Printer';
        } else if (category === 'Laptops') {
          category = 'Hardware';
          subcategory = 'Laptop';
        } else if (category === 'Software' && !subcategory) {
          // Guess subcategory from name if possible, or default to Gmail
          subcategory = 'Gmail';
        }

        // Ensure subcategory is valid for Hardware
        const hardwareSubs = ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others'];
        if (category === 'Hardware' && (!subcategory || !hardwareSubs.includes(subcategory))) {
          subcategory = 'Others';
        }

        assetList.push({ 
          id: doc.id, 
          ...data,
          category,
          subcategory
        } as Asset);
      });
      setAssets(assetList);
      setIsLoading(false);
    }, (error) => {
      console.error('Assets snapshot error:', error);
      setIsLoading(false);
      // We don't throw here to avoid crashing the whole app, but we log it
    });

    const settingsRef = doc(db, 'settings', 'global-settings');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ id: snapshot.id, ...snapshot.data() } as GlobalSettings);
      } else if (user?.role === 'Admin') {
        // Only Admin initializes global settings if none exist
        const defaultSettings: Omit<GlobalSettings, 'id'> = {
          hardwareWarranty: {
            System: 36,
            Printer: 12,
            Laptop: 36,
            Networking: 24,
            Display: 24,
            Others: 12
          },
          softwareWarranty: {
            Gmail: 12,
            AutoCAD: 12,
            'Adobe Acrobat': 12,
            'Microsoft Office': 12,
            SAP: 12
          },
          notificationsEnabled: true,
          gatePassCounter: 0,
          gatePassHeaders: {
            gatePassNo: 'Gate Pass No.',
            createDate: 'Create Date',
            plantName: 'Plant Name',
            transporter: 'Transporter',
            receiverCode: 'Receiver Code',
            reason: 'Reason',
            receiverName: 'Receiver Name',
            remark: 'Remark',
            receiverAddress: 'Receiver Address',
            vehicleNo: 'Vehicle No.',
            gstNo: 'GST No.',
            lrNo: 'LR No.',
            requestedBy: 'Requested By',
            deptName: 'Dept. Name'
          },
          uid: 'system'
        };
        setDoc(settingsRef, defaultSettings).catch(err => {
          console.error('Error initializing global settings:', err);
        });
      }
    }, (error) => {
      console.error('Settings snapshot error:', error);
    });

    const gatePassesQuery = query(collection(db, 'gatePasses'));
    const unsubscribeGatePasses = onSnapshot(gatePassesQuery, (snapshot) => {
      const gpList: GatePass[] = [];
      snapshot.forEach((doc) => {
        gpList.push({ id: doc.id, ...doc.data() } as GatePass);
      });
      
      setGatePasses(gpList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      }));
    });

    const activitiesQuery = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activityList: Activity[] = [];
      snapshot.forEach((doc) => {
        activityList.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setActivities(activityList);
    });

    return () => {
      unsubscribeAssets();
      unsubscribeSettings();
      unsubscribeGatePasses();
      unsubscribeActivities();
    };
  }, [user, isAuthReady]);

  const addAsset = async (assetData: Omit<Asset, 'id' | 'uid'>) => {
    if (!user) return;
    const path = 'assets';
    try {
      // Duplication prevention by Serial Number
      if (assetData.sysSlNo && assetData.sysSlNo !== 'N/A' && assets.some(a => a.sysSlNo === assetData.sysSlNo)) {
        toast.error(`Asset with serial number ${assetData.sysSlNo} already exists.`);
        return;
      }

      const docRef = await addDoc(collection(db, path), {
        ...assetData,
        uid: user.id,
        createdAt: serverTimestamp(),
      });
      addActivity('Create', `Asset ${assetData.name} added`);
      await logAssetHistory(docRef.id, 'CREATED', `Asset ${assetData.name} created`, null, assetData);

      // One-way sync to Software -> Master Sheet if it's a Hardware asset
      if (assetData.category === 'Hardware') {
        const masterSheetAsset: Omit<Asset, 'id' | 'uid'> = {
          name: assetData.name,
          category: 'Software',
          subcategory: 'Master Sheet',
          status: assetData.status,
          value: 0,
          sysSlNo: assetData.sysSlNo || 'N/A',
          model: assetData.model || 'N/A',
          additionalFields: {
            originalAssetId: docRef.id,
            hardwareCategory: assetData.category,
            hardwareSubcategory: assetData.subcategory
          }
        };
        await addDoc(collection(db, 'assets'), {
          ...masterSheetAsset,
          uid: user.id,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateAsset = async (id: string, assetData: Partial<Asset>) => {
    const path = `assets/${id}`;
    try {
      const assetRef = doc(db, 'assets', id);
      const currentAsset = assets.find(a => a.id === id);
      
      await updateDoc(assetRef, {
        ...assetData,
        updatedAt: serverTimestamp(),
      });
      
      // One-way sync to Software -> Master Sheet if it's a Hardware asset
      if (currentAsset?.category === 'Hardware') {
        const q = query(
          collection(db, 'assets'), 
          where('subcategory', '==', 'Master Sheet'),
          where('additionalFields.originalAssetId', '==', id)
        );
        const masterDocs = await getDocs(q);
        const batch = writeBatch(db);
        masterDocs.forEach(masterDoc => {
          batch.update(masterDoc.ref, {
            name: assetData.name || currentAsset.name,
            sysSlNo: assetData.sysSlNo || currentAsset.sysSlNo,
            status: assetData.status || currentAsset.status,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }

      // Log changes
      if (currentAsset) {
        Object.keys(assetData).forEach(async (key) => {
          const k = key as keyof Asset;
          if (assetData[k] !== currentAsset[k] && k !== 'updatedAt') {
            await logAssetHistory(
              id, 
              'UPDATED', 
              `${k} updated`, 
              currentAsset[k], 
              assetData[k]
            );
          }
        });
      }

      addActivity('Update', `Asset ${id} updated`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteAsset = async (id: string) => {
    console.log('Deleting asset with ID:', id);
    const path = `assets/${id}`;
    try {
      await deleteDoc(doc(db, 'assets', id));
      console.log('Asset deleted successfully');
      addActivity('Delete', `Asset ${id} removed`);
    } catch (error) {
      console.error('Error deleting asset:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const sanitizeForFirestore = (data: any): any => {
    if (data === undefined) return null;
    if (data === null || typeof data !== 'object') return data;
    if (data instanceof Date) return data;
    
    // Skip Firestore FieldValue objects (like serverTimestamp)
    if (data.constructor && data.constructor.name === 'FieldValue') return data;
    // Also skip other non-plain objects to be safe
    if (data.constructor && data.constructor !== Object && !Array.isArray(data)) return data;
    
    if (Array.isArray(data)) {
      return data.map(sanitizeForFirestore);
    }
    
    const sanitized: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    });
    return sanitized;
  };

  const updateSchema = async (category: string, subcategory: string, schema: FieldDefinition[]) => {
    if (!user || !settings) return;
    const settingsRef = doc(db, 'settings', 'global-settings');
    const schemaKey = `${category}_${subcategory}`;
    const updatedSchemas = { 
      ...settings.customSchemas, 
      [schemaKey]: schema 
    };
    await setDoc(settingsRef, sanitizeForFirestore({ customSchemas: updatedSchemas }), { merge: true });
  };

  const recoverSchema = async (category: string, subcategory: string) => {
    if (!user || !settings) return;
    
    const schemaKey = `${category}_${subcategory}`;
    const currentSchema = settings.customSchemas?.[schemaKey] || [];
    const seenKeys = new Set(currentSchema.map(f => f.key));
    const newFields: FieldDefinition[] = [];

    // Scan all assets in this subcategory to find keys in additionalFields
    assets.forEach(asset => {
      if (asset.category === category && asset.subcategory === subcategory && asset.additionalFields) {
        Object.keys(asset.additionalFields).forEach(key => {
          if (!seenKeys.has(key)) {
            newFields.push({
              key,
              label: key.replace(/_/g, ' ').toUpperCase(),
              type: 'text',
              showInTable: true
            });
            seenKeys.add(key);
          }
        });
      }
    });

    if (newFields.length > 0) {
      await updateSchema(category, subcategory, [...currentSchema, ...newFields]);
      addActivity('Update', `Recovered ${newFields.length} missing columns for ${subcategory}`);
    }
  };

  const bulkImport = async (newAssets: Omit<Asset, 'id' | 'uid'>[], category?: string, subcategory?: string, newSchema?: FieldDefinition[]) => {
    if (!user) return;
    
    // Filter out duplicates based on Serial Number
    const existingSerialNumbers = new Set(assets.map(a => a.sysSlNo).filter(s => s && s !== 'N/A'));
    const uniqueNewAssets = newAssets.filter(a => {
      if (!a.sysSlNo || a.sysSlNo === 'N/A') return true;
      if (existingSerialNumbers.has(a.sysSlNo)) return false;
      existingSerialNumbers.add(a.sysSlNo);
      return true;
    });

    if (uniqueNewAssets.length === 0) {
      toast.error('All assets in the list already exist.');
      return;
    }

    if (uniqueNewAssets.length < newAssets.length) {
      toast.info(`Skipped ${newAssets.length - uniqueNewAssets.length} duplicate assets.`);
    }

    console.log('Bulk importing assets:', uniqueNewAssets.length);
    const path = 'assets (bulk)';
    
    try {
      const batch = writeBatch(db);

      // 1. Update schema if provided
      if (category && subcategory && newSchema && settings) {
        const settingsRef = doc(db, 'settings', 'global-settings');
        const schemaKey = `${category}_${subcategory}`;
        const updatedSchemas = { 
          ...settings.customSchemas, 
          [schemaKey]: newSchema 
        };
        batch.set(settingsRef, sanitizeForFirestore({ customSchemas: updatedSchemas }), { merge: true });
      }

      // 2. Add assets
      // Split into chunks of 500 (Firestore batch limit)
      const chunks = [];
      const firstChunkSize = subcategory && newSchema ? 499 : 500;
      chunks.push(uniqueNewAssets.slice(0, firstChunkSize));
      for (let i = firstChunkSize; i < uniqueNewAssets.length; i += 500) {
        chunks.push(uniqueNewAssets.slice(i, i + 500));
      }

      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = i === 0 ? batch : writeBatch(db);
        const chunk = chunks[i];
        
        for (const asset of chunk) {
          const docRef = doc(collection(db, 'assets'));
          currentBatch.set(docRef, sanitizeForFirestore({
            ...asset,
            uid: user.id,
            createdAt: serverTimestamp(),
          }));
        }
        await currentBatch.commit();
      }
      
      console.log('Bulk import completed');
      addActivity('Import', `Bulk import of ${uniqueNewAssets.length} assets completed`);
    } catch (error) {
      console.error('Bulk import failed:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const bulkDelete = async (ids: string[]) => {
    console.log('Bulk deleting assets with IDs:', ids);
    if (!user) return;
    const path = 'assets (bulk delete)';
    
    try {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 500) {
        chunks.push(ids.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          const docRef = doc(db, 'assets', id);
          batch.delete(docRef);
        });
        await batch.commit();
      }
      
      console.log('Bulk deletion completed');
      addActivity('Delete', `Bulk deletion of ${ids.length} assets completed`);
    } catch (error) {
      console.error('Bulk deletion failed:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const bulkUpdateStatus = async (ids: string[], status: AssetStatus) => {
    if (!user) return;
    const path = 'assets (bulk update status)';
    try {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 500) {
        chunks.push(ids.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const id of chunk) {
          const docRef = doc(db, 'assets', id);
          const updateData: any = { 
            status,
            updatedAt: serverTimestamp()
          };
          
          batch.update(docRef, updateData);
          
          const currentAsset = assets.find(a => a.id === id);
          await logAssetHistory(
            id, 
            'BULK_UPDATE', 
            `Status updated via bulk action to ${status}`, 
            currentAsset?.status, 
            status
          );
        }
        await batch.commit();
      }
      
      addActivity('Update', `Bulk status update to ${status} for ${ids.length} assets`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const bulkUpdateWarranty = async (category: AssetCategory, subcategory: string, duration: number) => {
    if (!user || !settings) return;
    const path = 'assets (bulk update warranty)';
    try {
      // 1. Update the default duration in settings
      const settingsRef = doc(db, 'settings', 'global-settings');
      const updatedSettings = category === 'Hardware' 
        ? { hardwareWarranty: { ...settings.hardwareWarranty, [subcategory]: duration } }
        : { softwareWarranty: { ...settings.softwareWarranty, [subcategory]: duration } };
      
      await setDoc(settingsRef, updatedSettings, { merge: true });

      // 2. Update all existing assets in that subcategory
      // Fetch all assets to handle legacy category normalization
      const q = query(collection(db, 'assets'));
      const snapshot = await getDocs(q);
      
      const matchingDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        let cat = data.category;
        let sub = data.subcategory;
        
        // Apply same normalization as in onSnapshot
        if (cat === 'Systems') { cat = 'Hardware'; sub = 'System'; }
        else if (cat === 'Printers') { cat = 'Hardware'; sub = 'Printer'; }
        else if (cat === 'Laptops') { cat = 'Hardware'; sub = 'Laptop'; }
        
        // If it's Hardware and subcategory is missing, it might be 'Others'
        const hardwareSubs = ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others'];
        if (cat === 'Hardware' && (!sub || !hardwareSubs.includes(sub))) {
          sub = 'Others';
        }

        return cat === category && sub === subcategory;
      });

      if (matchingDocs.length === 0) {
        addActivity('Update', `Bulk warranty update: No matching assets found for ${category} - ${subcategory}`);
        return;
      }

      const chunks = [];
      for (let i = 0; i < matchingDocs.length; i += 500) {
        chunks.push(matchingDocs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.update(d.ref, { 
            warrantyDurationMonths: duration,
            updatedAt: serverTimestamp()
          });
          
          // Log history (background)
          logAssetHistory(
            d.id, 
            'BULK_UPDATE', 
            `Warranty duration updated via bulk action to ${duration} months`, 
            d.data().warrantyDurationMonths, 
            duration
          );
        }
        await batch.commit();
      }
      
      addActivity('Update', `Bulk warranty update for ${category} - ${subcategory} to ${duration} months for ${matchingDocs.length} assets`);
    } catch (error) {
      console.error('Bulk update error:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const assignAsset = async (assetId: string, assignedUser: { userId: string, name: string, email?: string } | null) => {
    const path = `assets/${assetId}/assign`;
    try {
      const assetRef = doc(db, 'assets', assetId);
      const currentAsset = assets.find(a => a.id === assetId);
      
      await updateDoc(assetRef, {
        assignedTo: assignedUser,
        updatedAt: serverTimestamp(),
      });
      
      const message = assignedUser 
        ? `Asset assigned to ${assignedUser.name} by Admin`
        : `Asset unassigned by Admin`;
      
      await logAssetHistory(
        assetId, 
        'ASSIGNMENT', 
        message, 
        currentAsset?.assignedTo, 
        assignedUser
      );
      
      addActivity('Assignment', message);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const addGatePass = async (assetId: string, gatePassData: Omit<GatePass, 'id' | 'createdAt' | 'gatePassNo'>) => {
    if (!user || !settings) return;
    try {
      const assetRef = doc(db, 'assets', assetId);
      const currentAsset = assets.find(a => a.id === assetId);
      if (!currentAsset) return;

      const nextCounter = (settings.gatePassCounter || 0) + 1;
      const year = new Date().getFullYear();
      const gatePassNo = `GP-${year}-${nextCounter.toString().padStart(4, '0')}`;

      const newGatePass: GatePass = {
        ...gatePassData,
        id: Math.random().toString(36).substr(2, 9),
        gatePassNo,
        createdAt: new Date().toISOString(),
        createdBy: {
          uid: user.id,
          name: user.name,
          role: user.role
        },
        assetId,
        assetName: currentAsset.name,
        uid: user.id
      } as any;

      // 1. Save to global gatePasses collection
      await addDoc(collection(db, 'gatePasses'), sanitizeForFirestore(newGatePass));

      // 2. Update asset's gatePassHistory
      const updatedHistory = [...(currentAsset.gatePassHistory || []), newGatePass];
      await updateDoc(assetRef, {
        gatePassHistory: sanitizeForFirestore(updatedHistory),
        updatedAt: serverTimestamp()
      });

      // 3. Update counter in settings
      const settingsRef = doc(db, 'settings', 'global-settings');
      await updateDoc(settingsRef, {
        gatePassCounter: nextCounter
      });

      addActivity('Update', `Gate Pass ${gatePassNo} added for asset ${currentAsset.name}`);
      return newGatePass;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assets/${assetId}/gatepass`);
    }
  };

  const updateGatePass = async (assetId: string, gatePassId: string, gatePassData: Partial<GatePass>) => {
    if (!user) return;
    try {
      const assetRef = doc(db, 'assets', assetId);
      const currentAsset = assets.find(a => a.id === assetId);
      if (!currentAsset || !currentAsset.gatePassHistory) return;

      // 1. Update asset's gatePassHistory
      const updatedHistory = currentAsset.gatePassHistory.map(gp => 
        gp.id === gatePassId ? { ...gp, ...gatePassData } : gp
      );

      await updateDoc(assetRef, {
        gatePassHistory: sanitizeForFirestore(updatedHistory),
        updatedAt: serverTimestamp()
      });

      // 2. Update global gatePasses collection
      // We need to find the document in gatePasses collection by its 'id' field (not doc ID)
      // or we should have stored the doc ID. 
      // Since we used addDoc, we don't have the doc ID easily.
      // Let's query for it.
      const gpQuery = query(collection(db, 'gatePasses'), where('id', '==', gatePassId));
      const gpSnapshot = await getDocs(gpQuery);
      if (!gpSnapshot.empty) {
        const gpDocRef = doc(db, 'gatePasses', gpSnapshot.docs[0].id);
        await updateDoc(gpDocRef, sanitizeForFirestore(gatePassData));
      }

      addActivity('Update', `Gate Pass updated for asset ${currentAsset.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assets/${assetId}/gatepass/${gatePassId}`);
    }
  };

  const deleteGatePass = async (assetId: string, gatePassId: string) => {
    if (!user) return;
    try {
      const assetRef = doc(db, 'assets', assetId);
      const currentAsset = assets.find(a => a.id === assetId);
      if (!currentAsset || !currentAsset.gatePassHistory) return;

      const gatePassToDelete = currentAsset.gatePassHistory.find(gp => gp.id === gatePassId);
      if (!gatePassToDelete) return;

      // 1. Update asset's gatePassHistory
      const updatedHistory = currentAsset.gatePassHistory.filter(gp => gp.id !== gatePassId);

      await updateDoc(assetRef, {
        gatePassHistory: sanitizeForFirestore(updatedHistory),
        updatedAt: serverTimestamp()
      });

      // 2. Delete from global gatePasses collection
      const gpQuery = query(collection(db, 'gatePasses'), where('id', '==', gatePassId));
      const gpSnapshot = await getDocs(gpQuery);
      if (!gpSnapshot.empty) {
        const gpDocRef = doc(db, 'gatePasses', gpSnapshot.docs[0].id);
        await deleteDoc(gpDocRef);
      }

      addActivity('Delete', `Gate Pass ${gatePassToDelete.gatePassNo} deleted for asset ${currentAsset.name}`);
      await logAssetHistory(assetId, 'GATE_PASS_DELETED', `Gate Pass ${gatePassToDelete.gatePassNo} deleted`, gatePassToDelete, null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assets/${assetId}/gatepass/${gatePassId}`);
    }
  };

  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    if (!user) return;
    const path = 'settings/global-settings';
    try {
      const settingsRef = doc(db, 'settings', 'global-settings');
      await setDoc(settingsRef, newSettings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateColumnWidths = async (category: string, subcategory: string, widths: Record<string, number> | null) => {
    if (!user || !settings) return;
    const settingsRef = doc(db, 'settings', 'global-settings');
    const schemaKey = `${category}_${subcategory}`;
    let updatedWidths = { ...(settings.columnWidths || {}) };
    if (widths === null) {
      delete updatedWidths[schemaKey];
    } else {
      updatedWidths[schemaKey] = {
        ...(updatedWidths[schemaKey] || {}),
        ...widths
      };
    }
    await setDoc(settingsRef, { columnWidths: updatedWidths }, { merge: true });
  };

  const updateColumnOrder = async (category: string, subcategory: string, order: string[]) => {
    if (!user || !settings) return;
    const settingsRef = doc(db, 'settings', 'global-settings');
    const schemaKey = `${category}_${subcategory}`;
    const updatedOrders = { 
      ...(settings.columnOrders || {}),
      [schemaKey]: order
    };
    await setDoc(settingsRef, { columnOrders: updatedOrders }, { merge: true });
  };

  const getEffectiveSchema = useCallback((category: string, subcategory: string): FieldDefinition[] => {
    const schemaKey = `${category}_${subcategory}`;
    
    // If we have a custom schema for this specific subcategory, use it
    if (settings?.customSchemas?.[schemaKey]) {
      return settings.customSchemas[schemaKey];
    }
    
    // Otherwise, use the static schema for this subcategory
    const staticSchema = ASSET_SCHEMA[subcategory as AssetSubcategory] || [];
    
    return staticSchema;
  }, [settings]);

  const getWarrantyStatus = useCallback((asset: Asset): { status: 'In Warranty' | 'Expiring' | 'Expired' | 'No Data'; expiryDate: Date | null } => {
    const effectiveDate = getAssetValue(asset, 'invoiceDate');

    if (!effectiveDate || String(effectiveDate).trim() === '' || String(effectiveDate).toUpperCase() === 'N/A' || String(effectiveDate).toUpperCase() === 'NA') {
      return { status: 'No Data', expiryDate: null };
    }
    
    try {
      let date: Date | null = null;
      
      // Handle Firestore Timestamp or Date object
      if (effectiveDate && typeof effectiveDate === 'object') {
        if ((effectiveDate as any).toDate) {
          date = (effectiveDate as any).toDate();
        } else if (effectiveDate instanceof Date) {
          date = effectiveDate;
        }
      }

      if (!date || !isValid(date)) {
        const strDate = String(effectiveDate).trim();

        // Handle Excel date numbers (days since 1900-01-01)
        if (/^\d+(\.\d+)?$/.test(strDate)) {
          const excelDate = parseFloat(strDate);
          if (excelDate > 25569 && excelDate < 100000) { // Reasonable range for Excel dates
            date = new Date((excelDate - 25569) * 86400 * 1000);
          } else if (excelDate > 1000000000) { // Likely a unix timestamp in ms or seconds
            date = new Date(excelDate > 10000000000 ? excelDate : excelDate * 1000);
          }
        }

        if (!date || !isValid(date)) {
          // Try ISO format
          const isoDate = parseISO(strDate);
          if (isValid(isoDate) && strDate.includes('-')) {
            date = isoDate;
          } else {
            // Try common formats
            const formats = [
              'dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy/MM/dd', 'MM/dd/yyyy', 'dd.MM.yyyy', 
              'd/M/yyyy', 'd-M-yyyy', 'yyyy-MM-dd', 'yyyy-M-d', 'd/M/yy', 'dd/MM/yy'
            ];
            for (const fmt of formats) {
              try {
                const parsedDate = parse(strDate, fmt, new Date());
                if (isValid(parsedDate)) {
                  if (parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
                    date = parsedDate;
                    break;
                  }
                }
              } catch (e) {
                // Ignore parsing errors for specific formats
              }
            }
          }
        }

        // Last resort: native Date constructor
        if (!date || !isValid(date)) {
          const nativeDate = new Date(strDate);
          if (isValid(nativeDate) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
            date = nativeDate;
          }
        }
      }

      if (!date || !isValid(date)) return { status: 'No Data', expiryDate: null };
      
      // Normalize duration
      let months = 0;
      const customDuration = getAssetValue(asset, 'warrantyDurationMonths');
      
      if (customDuration !== undefined && customDuration !== null && String(customDuration).toUpperCase() !== "N/A") {
        months = Number(customDuration);
      }

      if (!months || isNaN(months)) {
        if (settings) {
          if (asset.category === 'Hardware') {
            months = settings.hardwareWarranty?.[asset.subcategory] || 36;
          } else if (asset.category === 'Software') {
            months = settings.softwareWarranty?.[asset.subcategory] || 12;
          } else {
            months = 12;
          }
        } else {
          // Fallback if settings not loaded yet
          months = asset.category === 'Hardware' ? 36 : 12;
        }
      }
      
      const expiryDate = addMonths(date, months);
      if (!isValid(expiryDate)) return { status: 'No Data', expiryDate: null };

      const now = new Date();
      const thirtyDaysFromNow = addDays(now, 30);

      let status: 'In Warranty' | 'Expiring' | 'Expired' | 'No Data' = 'In Warranty';
      if (now > expiryDate) {
        status = 'Expired';
      } else if (isWithinInterval(expiryDate, { start: now, end: thirtyDaysFromNow })) {
        status = 'Expiring';
      }
      
      return { status, expiryDate };
    } catch (error) {
      console.error('Error calculating warranty status:', error);
      return { status: 'No Data', expiryDate: null };
    }
  }, [settings]);

  const getAssetById = (id: string) => {
    return assets.find(a => a.id === id);
  };

  const getAssetHistory = async (assetId: string) => {
    if (!user) return [];
    const path = `assets/${assetId}/history`;
    try {
      const q = query(collection(db, 'assets', assetId, 'history'));
      const snapshot = await getDocs(q);
      const history: AssetHistory[] = [];
      snapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() } as AssetHistory);
      });
      // Sort by timestamp desc
      return history.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  };

  const logAssetHistory = async (
    assetId: string, 
    actionType: string, 
    description: string, 
    oldValue: any, 
    newValue: any
  ) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'assets', assetId, 'history'), {
        assetId,
        actionType,
        description,
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: newValue === undefined ? null : newValue,
        performedBy: user.id,
        performedByName: user.name,
        timestamp: serverTimestamp(),
        uid: user.id
      });
    } catch (error) {
      console.error('Error logging asset history:', error);
    }
  };

  const getMaintenanceRecords = async (assetId: string) => {
    if (!user) return [];
    const path = `assets/${assetId}/maintenance`;
    try {
      const q = query(collection(db, 'assets', assetId, 'maintenance'));
      const snapshot = await getDocs(q);
      const records: MaintenanceRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as MaintenanceRecord);
      });
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  };

  const addMaintenanceRecord = async (assetId: string, recordData: Omit<MaintenanceRecord, 'id' | 'assetId' | 'uid'>) => {
    if (!user) return;
    const path = `assets/${assetId}/maintenance`;
    try {
      await addDoc(collection(db, 'assets', assetId, 'maintenance'), {
        ...recordData,
        assetId,
        uid: user.id,
        createdAt: serverTimestamp(),
      });
      addActivity('Update', `Maintenance record added for asset ${assetId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const addActivity = async (type: Activity['type'], message: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'activities'), {
        type,
        message,
        timestamp: new Date().toISOString(),
        user: user.name,
        uid: user.id
      });
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const getFinancialYearStats = useCallback((year: number) => {
    const startDate = new Date(year, 3, 1); // April 1st
    const endDate = new Date(year + 1, 2, 31, 23, 59, 59); // March 31st
    
    const fyAssets = assets.filter(a => {
      if (!a.createdAt) return false;
      const createdDate = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      return createdDate >= startDate && createdDate <= endDate;
    });

    const added = fyAssets.length;
    const repaired = assets.filter(a => {
      if (a.status !== 'In Repair') return false;
      if (!a.updatedAt) return false;
      const updatedDate = a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
      return updatedDate >= startDate && updatedDate <= endDate;
    }).length;
    
    const ewaste = assets.filter(a => {
      if (a.status === 'E-Waste' || a.status === 'Move to E-Waste') {
        if (!a.updatedAt) return false;
        const updatedDate = a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
        return updatedDate >= startDate && updatedDate <= endDate;
      }
      return false;
    }).length;

    return { added, repaired, ewaste };
  }, [assets]);

  const vendors = useMemo(() => {
    const vSet = new Set<string>();
    assets.forEach(a => {
      if (a.vendor) vSet.add(a.vendor);
      if (a.gatePassHistory) {
        a.gatePassHistory.forEach(gp => {
          if (gp.vendor) vSet.add(gp.vendor);
        });
      }
    });
    return Array.from(vSet).sort();
  }, [assets]);

  const stats = useMemo(() => {
    const hardware = { total: 0, active: 0, inRepair: 0, replaced: 0, ewaste: 0, itStock: 0, bySubcategory: {} as Record<string, number> };
    const software = { total: 0, active: 0, inactive: 0, bySubcategory: {} as Record<string, number> };
    const warranty = { active: 0, expiring: 0, expired: 0, noData: 0 };

    assets.forEach(a => {
      // Hardware/Software/E-Waste stats
      if (a.status === 'E-Waste' || a.status === 'Move to E-Waste') {
        hardware.ewaste++;
      }

      if (a.category === 'Hardware') {
        hardware.total++;
        if (a.status === 'Active') hardware.active++;
        else if (a.status === 'In Repair') hardware.inRepair++;
        else if (a.status === 'Replaced') hardware.replaced++;
        else if (a.status === 'In IT Stock') hardware.itStock++;

        if (a.subcategory) {
          hardware.bySubcategory[a.subcategory] = (hardware.bySubcategory[a.subcategory] || 0) + 1;
        }
      } else if (a.category === 'Software') {
        software.total++;
        if (a.status === 'Active') software.active++;
        else software.inactive++;

        if (a.subcategory) {
          software.bySubcategory[a.subcategory] = (software.bySubcategory[a.subcategory] || 0) + 1;
        }
      }

      // Warranty stats
      const { status } = getWarrantyStatus(a);
      switch (status) {
        case 'In Warranty': warranty.active++; break;
        case 'Expiring': warranty.expiring++; break;
        case 'Expired': warranty.expired++; break;
        case 'No Data': warranty.noData++; break;
      }
    });

    return { hardware, software, warranty };
  }, [assets, settings, getWarrantyStatus]);

  return (
    <AssetContext.Provider value={{ assets, activities, gatePasses, settings, addAsset, updateAsset, deleteAsset, updateSchema, recoverSchema, bulkImport, bulkDelete, bulkUpdateStatus, bulkUpdateWarranty, assignAsset, addGatePass, updateGatePass, deleteGatePass, updateSettings, updateColumnWidths, updateColumnOrder, getAssetById, getAssetHistory, getMaintenanceRecords, addMaintenanceRecord, getWarrantyStatus, getEffectiveSchema, getFinancialYearStats, stats, vendors, isLoading }}>
      {children}
    </AssetContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (!context) throw new Error('useAssets must be used within AssetProvider');
  return context;
};
