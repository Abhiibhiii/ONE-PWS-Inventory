import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Alert, Asset, AlertActionType } from '../types';
import { useAuth } from './useAuth';
import { useAssets } from './useAssets';
import { useAuditLogs } from './useAuditLogs';
import { differenceInDays, parseISO, addMonths } from 'date-fns';

interface AlertContextType {
  alerts: Alert[];
  resolvedAlerts: Alert[];
  resolveAlert: (alertId: string, actionTaken?: string) => Promise<void>;
  takeAction: (alert: Alert, actionType: string, description: string) => Promise<void>;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { assets, settings, getWarrantyStatus } = useAssets();
  const { addLog } = useAuditLogs();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch alerts from Firestore
  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setResolvedAlerts([]);
      setLoading(false);
      return;
    }

    const qActive = query(
      collection(db, 'alerts'),
      where('status', '==', 'ACTIVE')
    );

    const qResolved = query(
      collection(db, 'alerts'),
      where('status', '==', 'RESOLVED')
    );

    const unsubscribeActive = onSnapshot(qActive, (snapshot) => {
      const activeAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(activeAlerts);
      setLoading(false);
    }, (error) => {
      console.error('Active alerts snapshot error:', error);
      setLoading(false);
    });

    const unsubscribeResolved = onSnapshot(qResolved, (snapshot) => {
      const resolved = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setResolvedAlerts(resolved);
    }, (error) => {
      console.error('Resolved alerts snapshot error:', error);
    });

    return () => {
      unsubscribeActive();
      unsubscribeResolved();
    };
  }, [user]);

  // Auto-generation and auto-resolution logic
  useEffect(() => {
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin') || !assets.length || !settings) return;

    const syncAlerts = async () => {
      const batch = writeBatch(db);
      const currentActiveAlerts = [...alerts];
      const currentResolvedAlerts = [...resolvedAlerts];

      // Helper to log creation
      const logCreation = async (alertId: string, type: string, message: string) => {
        await addLog(alertId, 'CREATED', `Alert created: ${type} - ${message}`, { type, message });
      };

      // Helper to find latest alert of a type (active or resolved)
      const getLatestAlert = (type: string) => {
        const active = currentActiveAlerts.find(a => a.type === type);
        if (active) return active;
        
        return currentResolvedAlerts
          .filter(a => a.type === type)
          .sort((a, b) => {
            const tA = a.resolvedAt?.seconds || 0;
            const tB = b.resolvedAt?.seconds || 0;
            return tB - tA;
          })[0];
      };

      // 1. Check for Warranty Expiring
      const expiringAssets = assets.filter(asset => {
        const { status } = getWarrantyStatus(asset);
        return status === 'Expiring';
      });

      const latestWarrantyAlert = getLatestAlert('Warranty');
      if (expiringAssets.length > 0) {
        const message = `${expiringAssets.length} Assets have warranties expiring in 30 days`;
        
        if (!latestWarrantyAlert || latestWarrantyAlert.message !== message || latestWarrantyAlert.status === 'RESOLVED') {
          // If latest is resolved but message is different, create new
          // If latest is active but message is different, update
          // If no latest, create new
          if (latestWarrantyAlert?.status === 'ACTIVE') {
            if (latestWarrantyAlert.message !== message) {
              batch.update(doc(db, 'alerts', latestWarrantyAlert.id), { message, updatedAt: serverTimestamp() });
              await addLog(latestWarrantyAlert.id, 'UPDATED', `Alert updated: ${message}`);
            }
          } else if (!latestWarrantyAlert || latestWarrantyAlert.message !== message) {
            // Only create if message changed or no previous alert
            const docRef = doc(collection(db, 'alerts'));
            const alertData: Omit<Alert, 'id'> = {
              type: 'Warranty',
              severity: 'Medium',
              message,
              suggestion: 'Review expiring assets and renew warranties or plan replacements.',
              status: 'ACTIVE',
              createdAt: serverTimestamp(),
              uid: user.id
            };
            batch.set(docRef, alertData);
            await logCreation(docRef.id, 'Warranty', message);
          }
        }
      } else if (latestWarrantyAlert?.status === 'ACTIVE') {
        batch.update(doc(db, 'alerts', latestWarrantyAlert.id), { 
          status: 'RESOLVED', 
          resolvedAt: serverTimestamp(),
          actionTaken: 'Auto-resolved: No expiring warranties found.'
        });
        await addLog(latestWarrantyAlert.id, 'AUTO_RESOLVED', 'Alert auto-resolved: No expiring warranties found.');
      }

      // 2. Check for Unassigned Assets
      const unassignedAssets = assets.filter(asset => !asset.assignedTo && asset.status === 'Active');
      const latestUnassignedAlert = getLatestAlert('Unassigned');
      if (unassignedAssets.length > 0) {
        const message = `${unassignedAssets.length} assets are currently unassigned`;
        
        if (!latestUnassignedAlert || latestUnassignedAlert.message !== message || latestUnassignedAlert.status === 'RESOLVED') {
          if (latestUnassignedAlert?.status === 'ACTIVE') {
            if (latestUnassignedAlert.message !== message) {
              batch.update(doc(db, 'alerts', latestUnassignedAlert.id), { message, updatedAt: serverTimestamp() });
              await addLog(latestUnassignedAlert.id, 'UPDATED', `Alert updated: ${message}`);
            }
          } else if (!latestUnassignedAlert || latestUnassignedAlert.message !== message) {
            const docRef = doc(collection(db, 'alerts'));
            const alertData: Omit<Alert, 'id'> = {
              type: 'Unassigned',
              severity: 'High',
              message,
              suggestion: 'Assign these assets to users or mark them as in storage.',
              status: 'ACTIVE',
              createdAt: serverTimestamp(),
              uid: user.id
            };
            batch.set(docRef, alertData);
            await logCreation(docRef.id, 'Unassigned', message);
          }
        }
      } else if (latestUnassignedAlert?.status === 'ACTIVE') {
        batch.update(doc(db, 'alerts', latestUnassignedAlert.id), { 
          status: 'RESOLVED', 
          resolvedAt: serverTimestamp(),
          actionTaken: 'Auto-resolved: All assets assigned.'
        });
        await addLog(latestUnassignedAlert.id, 'AUTO_RESOLVED', 'Alert auto-resolved: All assets assigned.');
      }

      // 3. Check for Maintenance Alerts
      const maintenanceNeeded = assets.filter(asset => {
        if (asset.status !== 'Active' || asset.category === 'Software') return false;
        
        try {
          const lastMaintenance = asset.maintenanceHistory && asset.maintenanceHistory.length > 0
            ? parseISO(asset.maintenanceHistory[0].date)
            : asset.createdAt 
              ? (typeof asset.createdAt.toDate === 'function' ? asset.createdAt.toDate() : new Date(asset.createdAt)) 
              : new Date();
          
          if (isNaN(lastMaintenance.getTime())) return false;
          
          return differenceInDays(new Date(), lastMaintenance) > 180; // 6 months
        } catch (e) {
          return false;
        }
      });

      const latestMaintenanceAlert = getLatestAlert('Maintenance');
      if (maintenanceNeeded.length > 0) {
        const message = `${maintenanceNeeded.length} assets require routine maintenance`;
        
        if (!latestMaintenanceAlert || latestMaintenanceAlert.message !== message || latestMaintenanceAlert.status === 'RESOLVED') {
          if (latestMaintenanceAlert?.status === 'ACTIVE') {
            if (latestMaintenanceAlert.message !== message) {
              batch.update(doc(db, 'alerts', latestMaintenanceAlert.id), { message, updatedAt: serverTimestamp() });
              await addLog(latestMaintenanceAlert.id, 'UPDATED', `Alert updated: ${message}`);
            }
          } else if (!latestMaintenanceAlert || latestMaintenanceAlert.message !== message) {
            const docRef = doc(collection(db, 'alerts'));
            const alertData: Omit<Alert, 'id'> = {
              type: 'Maintenance',
              severity: 'Low',
              message,
              suggestion: 'Schedule routine maintenance for these assets to ensure optimal performance.',
              status: 'ACTIVE',
              createdAt: serverTimestamp(),
              uid: user.id
            };
            batch.set(docRef, alertData);
            await logCreation(docRef.id, 'Maintenance', message);
          }
        }
      } else if (latestMaintenanceAlert?.status === 'ACTIVE') {
        batch.update(doc(db, 'alerts', latestMaintenanceAlert.id), { 
          status: 'RESOLVED', 
          resolvedAt: serverTimestamp(),
          actionTaken: 'Auto-resolved: No maintenance required.'
        });
        await addLog(latestMaintenanceAlert.id, 'AUTO_RESOLVED', 'Alert auto-resolved: No maintenance required.');
      }

      await batch.commit();
    };

    const timeoutId = setTimeout(syncAlerts, 2000); // Debounce sync
    return () => clearTimeout(timeoutId);
  }, [assets, settings, user, getWarrantyStatus]);

  const resolveAlert = async (alertId: string, actionTaken?: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        actionTaken: actionTaken || 'Manually resolved'
      });
      await addLog(alertId, 'RESOLVED', `Alert resolved: ${actionTaken || 'Manually resolved'}`);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const takeAction = async (alert: Alert, actionType: string, description: string) => {
    try {
      await addLog(alert.id, 'ACTION_TAKEN', `Action taken: ${actionType} - ${description}`, { actionType, description });
      console.log('Action taken on alert:', alert, actionType, description);
    } catch (error) {
      console.error('Error taking action on alert:', error);
    }
  };

  const sortedAlerts = useMemo(() => {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    return [...alerts].sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity]);
  }, [alerts]);

  return (
    <AlertContext.Provider value={{ alerts: sortedAlerts, resolvedAlerts, resolveAlert, takeAction, loading }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
