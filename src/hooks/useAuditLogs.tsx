import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { AlertAuditLog, AlertActionType } from '../types';
import { useAuth } from './useAuth';

interface AuditLogContextType {
  logs: AlertAuditLog[];
  getLogsForAlert: (alertId: string) => AlertAuditLog[];
  addLog: (alertId: string, actionType: AlertActionType, description: string, metadata?: any) => Promise<void>;
  loading: boolean;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

export const AuditLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AlertAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // For simplicity, we fetch all logs for the current user's alerts
    // In a real app, you might want to fetch per alert or paginate
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertAuditLog));
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error('Audit logs snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getLogsForAlert = (alertId: string) => {
    return logs.filter(log => log.alertId === alertId);
  };

  const addLog = async (alertId: string, actionType: AlertActionType, description: string, metadata?: any) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        alertId,
        actionType,
        description,
        performedBy: user?.id || 'SYSTEM',
        timestamp: serverTimestamp(),
        metadata: metadata || null
      });
    } catch (error) {
      console.error('Error adding audit log:', error);
    }
  };

  return (
    <AuditLogContext.Provider value={{ logs, getLogsForAlert, addLog, loading }}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLogs = () => {
  const context = useContext(AuditLogContext);
  if (context === undefined) {
    throw new Error('useAuditLogs must be used within an AuditLogProvider');
  }
  return context;
};
