import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, googleProvider } from '../lib/firebase';
import { deleteTestAppleAccountOnServer } from '../utils/accountDeletionApi';
import { deleteAllUserDataFromFirestore } from '../utils/firestoreStorage';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  providerIds: string[];
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
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
          displayName: currentUser.displayName,
          providerIds: currentUser.providerData.map(provider => provider.providerId),
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
    const electronAuth = (window as typeof window & {
      electronAuth?: {
        signInWithGoogle: () => Promise<{ idToken: string; accessToken: string | null }>;
      };
    }).electronAuth;
    if (electronAuth) {
      const { idToken, accessToken } = await electronAuth.signInWithGoogle();
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

  const deleteAccount = async (password?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('auth/no-current-user');

    const providerIds = currentUser.providerData.map(provider => provider.providerId);
    if (providerIds.includes('password')) {
      if (!currentUser.email || !password) throw new Error('auth/password-required');
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } else if (providerIds.includes('google.com')) {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
        const idToken = result.credential?.idToken ?? null;
        const accessToken = result.credential?.accessToken ?? null;
        if (!idToken) throw new Error('auth/missing-google-token');
        await reauthenticateWithCredential(currentUser, GoogleAuthProvider.credential(idToken, accessToken));
      } else {
        await reauthenticateWithPopup(currentUser, googleProvider);
      }
    } else if (providerIds.includes('apple.com')) {
      if (Capacitor.getPlatform() !== 'ios') {
        throw new Error('auth/unsupported-provider');
      }
      const originalUid = currentUser.uid;
      const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
      const identityToken = result.credential?.idToken ?? null;
      const rawNonce = result.credential?.nonce ?? null;
      const authorizationCode = result.credential?.authorizationCode ?? null;
      if (!identityToken || !rawNonce || !authorizationCode) {
        throw new Error('auth/missing-apple-credential');
      }
      const appleProvider = new OAuthProvider('apple.com');
      const credential = appleProvider.credential({ idToken: identityToken, rawNonce });
      const reauthenticatedUser = await reauthenticateWithCredential(currentUser, credential);
      if (reauthenticatedUser.user.uid !== originalUid) {
        throw new Error('auth/user-mismatch');
      }
      const freshFirebaseIdToken = await reauthenticatedUser.user.getIdToken(true);
      await deleteTestAppleAccountOnServer(freshFirebaseIdToken, authorizationCode);
      await signOut(auth);
      return;
    } else {
      throw new Error('auth/unsupported-provider');
    }

    await deleteAllUserDataFromFirestore(currentUser.uid);
    await deleteUser(currentUser);

    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAuthentication.signOut();
      } catch (error) {
        console.warn('Native Firebase session cleanup failed after account deletion:', error);
      }
    }
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
        deleteAccount,
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
