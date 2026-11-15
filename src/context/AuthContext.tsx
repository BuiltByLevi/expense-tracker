import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { auth } from '../utils/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  /** Emails a Firebase password-reset link to the given address. */
  resetPassword: (email: string) => Promise<void>;
  /** Confirms the signed-in user's password (Firebase requires a fresh sign-in before deleting an account). */
  reauthenticate: (password: string) => Promise<void>;
  /** Permanently deletes the signed-in user's login. Delete their data first. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.hash = '';
  };

  const signup = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.hash = '';
  };

  const logout = async () => {
    await signOut(auth);
    window.location.hash = '';
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, data);
    setUser({ ...auth.currentUser });
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const reauthenticate = async (password: string) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error('Not signed in');
    await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    await deleteUser(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUserProfile, resetPassword, reauthenticate, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};