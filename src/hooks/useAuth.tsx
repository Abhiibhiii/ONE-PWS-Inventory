import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time sync of profile
        unsubUser = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const adminEmail = 'abhijeetsharmawork1@gmail.com';
            
            // Force Super Admin role for the specific admin email if not already set
            if (firebaseUser.email === adminEmail && data.role !== 'Super Admin') {
              await updateDoc(userRef, { role: 'Super Admin' });
              // The next snapshot will have the updated role
              return;
            }

            setUser({
              id: firebaseUser.uid,
              name: data.name,
              email: data.email,
              role: data.role,
              avatar: data.avatar,
              status: data.status || 'Active',
              joinedAt: data.joinedAt || data.createdAt || new Date().toISOString(),
              preferences: data.preferences,
              stats: data.stats
            });
            setIsAuthReady(true);
          } else {
            // Initial creation
            const adminEmail = 'abhijeetsharmawork1@gmail.com';
            const role: UserRole = firebaseUser.email === adminEmail ? 'Super Admin' : 'Viewer';
            
            const initialData = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role,
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email}`,
              status: 'Active',
              joinedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              preferences: {
                emailNotifications: true,
                inAppNotifications: true,
                alertTypes: {
                  high: true,
                  warranty: true,
                  system: true
                }
              },
              stats: {
                alertsHandled: 0,
                actionsPerformed: 0,
                lastLogin: new Date().toISOString()
              }
            };
            
            await setDoc(userRef, initialData);
            // onSnapshot will fire again after setDoc
          }
        }, (error) => {
          console.error('User snapshot error:', error);
          setIsAuthReady(true);
        });

        // Update last login (non-blocking)
        updateDoc(userRef, {
          'stats.lastLogin': new Date().toISOString()
        }).catch(() => {});
      } else {
        setUser(null);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/user-cancelled') {
        throw new Error('The login popup was closed before completion. Please try again and ensure you complete the sign-in process.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('The login popup was blocked by your browser. Please allow popups for this site to sign in.');
      } else {
        console.error('Login error:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, data);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isAuthenticated: !!user, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
