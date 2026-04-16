import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export type UserRole = 'tech' | 'admin' | 'pending' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubsDoc: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (unsubsDoc) {
        unsubsDoc();
        unsubsDoc = undefined;
      }

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          unsubsDoc = onSnapshot(userDocRef, 
            async (docSnap) => {
              if (docSnap.exists()) {
                setRole((docSnap.data().role as UserRole) || null);
              } else {
                // First time login - auto create the user record with 'pending' role
                try {
                  await setDoc(userDocRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || '',
                    role: 'pending',
                    createdAt: serverTimestamp()
                  });
                  // It will trigger another snapshot once created, but we can optimistically set
                  setRole('pending');
                } catch (err) {
                  console.error("Failed to create pending user doc:", err);
                  setRole('pending'); // UI fallback to pending screen anyway
                }
              }
              setLoading(false);
            }, 
            (error) => {
              console.error("Error listening to user role:", error);
              setRole(null);
              setLoading(false);
            }
          );
        } catch (error) {
          console.error("Error setting up role listener:", error);
          setRole(null);
          setLoading(false);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubsDoc) unsubsDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
