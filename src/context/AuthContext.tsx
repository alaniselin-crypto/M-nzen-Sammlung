import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, googleProvider } from '../lib/firebase';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await signInWithEmailAndPassword(auth, cleanEmail, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const loginWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
      const idToken = result.credential?.idToken ?? null;
      const accessToken = result.credential?.accessToken ?? null;
      if (!idToken) {
        throw new Error('Native Google Sign-In returned no ID token.');
      }
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      await signInWithCredential(auth, credential);
      return;
    }
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(auth);
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
