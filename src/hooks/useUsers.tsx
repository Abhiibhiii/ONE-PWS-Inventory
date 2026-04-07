import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { useAuth } from './useAuth';

interface UserContextType {
  users: User[];
  loading: boolean;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserStatus: (userId: string, status: 'Active' | 'Inactive' | 'Pending') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady || !user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      console.error('Users snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const updateUserStatus = async (userId: string, status: 'Active' | 'Inactive' | 'Pending') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ users, loading, updateUserRole, updateUserStatus, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};
