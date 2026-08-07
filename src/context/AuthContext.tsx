import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_USER_KEY = 'numisma_cloud_user_v2';

function makeCustomUid(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const safePart = cleanEmail.replace(/[^a-z0-9]/g, '_');
  return `usr_${safePart}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check saved custom user session first
    const savedCustomUser = localStorage.getItem(LOCAL_USER_KEY);
    if (savedCustomUser) {
      try {
        const parsed = JSON.parse(savedCustomUser);
        if (parsed && parsed.uid && parsed.email) {
          setUser(parsed);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to parse saved cloud user session:', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const appU: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        };
        setUser(appU);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Attempt standard Firebase Auth
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const appU: AppUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName
      };
      setUser(appU);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
    } catch (err: any) {
      // If Firebase Auth is disabled or missing provider on backend, use Firestore Direct Cloud Account
      if (
        err.code === 'auth/operation-not-allowed' || 
        err.code === 'auth/deleted_client' ||
        err.code === 'auth/configuration-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found'
      ) {
        const uid = makeCustomUid(cleanEmail);
        const userDocRef = doc(db, 'userSettings', uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.passHash && data.passHash !== pass) {
            const errorObj: any = new Error('Falsches Passwort für dieses Konto.');
            errorObj.code = 'auth/wrong-password';
            throw errorObj;
          }
        } else {
          // Doc doesn't exist yet, auto-create account in Firestore
          await setDoc(userDocRef, {
            email: cleanEmail,
            passHash: pass,
            createdAt: new Date().toISOString(),
            userId: uid
          }, { merge: true });
        }

        const appU: AppUser = { uid, email: cleanEmail };
        setUser(appU);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
        return;
      }
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Attempt standard Firebase Auth
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const appU: AppUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName
      };
      setUser(appU);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' || 
        err.code === 'auth/deleted_client' ||
        err.code === 'auth/configuration-not-found'
      ) {
        const uid = makeCustomUid(cleanEmail);
        const userDocRef = doc(db, 'userSettings', uid);
        
        await setDoc(userDocRef, {
          email: cleanEmail,
          passHash: pass,
          updatedAt: new Date().toISOString(),
          userId: uid
        }, { merge: true });

        const appU: AppUser = { uid, email: cleanEmail };
        setUser(appU);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
        return;
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/deleted_client') {
        const uid = makeCustomUid(cleanEmail);
        const userDocRef = doc(db, 'userSettings', uid);
        await setDoc(userDocRef, {
          email: cleanEmail,
          resetRequestedAt: new Date().toISOString()
        }, { merge: true });
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const appU: AppUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName
      };
      setUser(appU);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appU));
    } catch (err: any) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

