import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import type { MonthlyEarnings } from '../types';

interface EarningsContextType {
  // Legacy/default value (kept for backward compat)
  earnings: number;
  // Per-month history: key = "YYYY-MM", value = MonthlyEarnings
  earningsHistory: Record<string, MonthlyEarnings>;
  // Default value setter (updates monthlyEarnings only — used for seeding new months)
  setEarnings: (amount: number) => Promise<void>;
  // Per-month getters/setters
  getEarningsForMonth: (year: number, month: number) => MonthlyEarnings | null;
  setEarningsForMonth: (
    year: number,
    month: number,
    amount: number,
    status?: 'confirmed' | 'estimated'
  ) => Promise<void>;
  loading: boolean;
}

const EarningsContext = createContext<EarningsContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useEarnings = () => {
  const context = useContext(EarningsContext);
  if (!context) {
    throw new Error('useEarnings must be used within an EarningsProvider');
  }
  return context;
};

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export const EarningsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [earnings, setEarningsState] = useState<number>(0);
  const [earningsHistory, setEarningsHistory] = useState<Record<string, MonthlyEarnings>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // One-time migration: seed all months from earliest possible (past 24 months) with default
  const seedHistoricalEarnings = useCallback(async (
    defaultAmount: number
  ): Promise<Record<string, MonthlyEarnings>> => {
    if (!user) return {};
    const seeded: Record<string, MonthlyEarnings> = {};
    const now = new Date();
    // Seed 24 months back from now
    for (let i = 24; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = monthKey(year, month);
      const entry: MonthlyEarnings = {
        year,
        month,
        amount: defaultAmount,
        status: 'estimated',
        source: 'migrated',
        updatedAt: new Date().toISOString(),
      };
      try {
        const docRef = doc(db, 'userSettings', user.uid, 'earningsHistory', key);
        await setDoc(docRef, entry, { merge: false });
        seeded[key] = entry;
      } catch (err) {
        console.error('Failed to seed month', key, err);
      }
    }
    return seeded;
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Load default monthlyEarnings
      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsSnap = await getDoc(settingsRef);
      let defaultEarnings = 0;
      if (settingsSnap.exists()) {
        defaultEarnings = settingsSnap.data().monthlyEarnings || 0;
        setEarningsState(defaultEarnings);
      } else {
        await setDoc(settingsRef, { monthlyEarnings: 0, updatedAt: new Date().toISOString() });
        setEarningsState(0);
      }

      // 2. Load earningsHistory subcollection
      const historyRef = collection(db, 'userSettings', user.uid, 'earningsHistory');
      const historySnap = await getDocs(historyRef);
      const history: Record<string, MonthlyEarnings> = {};
      historySnap.forEach((docSnap) => {
        const data = docSnap.data();
        const key = monthKey(data.year, data.month);
        history[key] = {
          year: data.year,
          month: data.month,
          amount: data.amount,
          status: data.status || 'confirmed',
          source: data.source || 'manual',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      });

      // 3. Migration: if history is empty, seed it from default for all past months
      if (Object.keys(history).length === 0 && defaultEarnings > 0) {
        const seededHistory = await seedHistoricalEarnings(defaultEarnings);
        setEarningsHistory(seededHistory);
      } else {
        setEarningsHistory(history);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, [user, seedHistoricalEarnings]);

  // Load default + history on auth change
  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setEarningsState(0);
        setEarningsHistory({});
        setLoading(false);
      });
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [user, loadAll]);

  // Legacy setter — updates only the default. Does NOT change history.
  const setEarnings = async (amount: number) => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }
    try {
      const settingsRef = doc(db, 'userSettings', user.uid);
      await setDoc(
        settingsRef,
        { monthlyEarnings: amount, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setEarningsState(amount);
      toast.success('Default earnings updated');
    } catch (error: unknown) {
      console.error('Error saving earnings:', error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const getEarningsForMonth = useCallback(
    (year: number, month: number): MonthlyEarnings | null => {
      const key = monthKey(year, month);
      return earningsHistory[key] || null;
    },
    [earningsHistory]
  );

  const setEarningsForMonth = async (
    year: number,
    month: number,
    amount: number,
    status: 'confirmed' | 'estimated' = 'confirmed'
  ) => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }
    const key = monthKey(year, month);
    const entry: MonthlyEarnings = {
      year,
      month,
      amount,
      status,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    };
    try {
      const docRef = doc(db, 'userSettings', user.uid, 'earningsHistory', key);
      await setDoc(docRef, entry);
      setEarningsHistory((prev) => ({ ...prev, [key]: entry }));
      toast.success(
        `Earnings for ${new Date(year, month).toLocaleString('en-IN', {
          month: 'short',
          year: 'numeric',
        })} saved`
      );
    } catch (error: unknown) {
      console.error('Error saving monthly earnings:', error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  return (
    <EarningsContext.Provider
      value={{
        earnings,
        earningsHistory,
        setEarnings,
        getEarningsForMonth,
        setEarningsForMonth,
        loading,
      }}
    >
      {children}
    </EarningsContext.Provider>
  );
};