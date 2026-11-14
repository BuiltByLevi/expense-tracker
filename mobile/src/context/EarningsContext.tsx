import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './AuthContext';
import type { MonthlyEarnings } from '@shared/types';

interface EarningsContextType {
  /** Default/fallback monthly figure (userSettings.monthlyEarnings). */
  earnings: number;
  earningsHistory: Record<string, MonthlyEarnings>;
  loading: boolean;
  getEarningsForMonth: (year: number, month: number) => MonthlyEarnings | null;
  setEarningsForMonth: (
    year: number,
    month: number,
    amount: number,
    status?: 'confirmed' | 'estimated',
    options?: { override?: boolean }
  ) => Promise<void>;
  /** Drops a month's manual override so it goes back to its imported total. */
  revertEarningsOverride: (year: number, month: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const EarningsContext = createContext<EarningsContextType | undefined>(undefined);

export const useEarnings = () => {
  const context = useContext(EarningsContext);
  if (!context) throw new Error('useEarnings must be used within an EarningsProvider');
  return context;
};

/** "YYYY-MM" — the document id used by the web app's earningsHistory subcollection. */
const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

export const EarningsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [earnings, setEarnings] = useState(0);
  const [earningsHistory, setEarningsHistory] = useState<Record<string, MonthlyEarnings>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user) {
      setEarnings(0);
      setEarningsHistory({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, 'userSettings', user.uid));
      setEarnings(settingsSnap.exists() ? settingsSnap.data().monthlyEarnings || 0 : 0);

      const historySnap = await getDocs(
        collection(db, 'userSettings', user.uid, 'earningsHistory')
      );
      const history: Record<string, MonthlyEarnings> = {};
      historySnap.forEach((d) => {
        history[d.id] = d.data() as MonthlyEarnings;
      });
      setEarningsHistory(history);
    } catch {
      // Non-fatal: months with no record fall back to the default figure,
      // exactly as computeFinanceTotals already handles a 'missing' month.
      setEarningsHistory({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const getEarningsForMonth = useCallback(
    (year: number, month: number) => earningsHistory[monthKey(year, month)] ?? null,
    [earningsHistory]
  );

  const setEarningsForMonth = async (
    year: number,
    month: number,
    amount: number,
    status: 'confirmed' | 'estimated' = 'confirmed',
    options: { override?: boolean } = {}
  ) => {
    if (!user) return;
    const key = monthKey(year, month);
    const entry: MonthlyEarnings = {
      year,
      month,
      amount,
      status,
      source: 'manual',
      updatedAt: new Date().toISOString(),
      // Only stored when set, matching the web app's record shape.
      ...(options.override && { override: true }),
    };
    await setDoc(doc(db, 'userSettings', user.uid, 'earningsHistory', key), entry);
    setEarningsHistory((prev) => ({ ...prev, [key]: entry }));
  };

  // Same behaviour as the web app: keep the record minus the flag, so the
  // month still has this number if the imported income is ever removed.
  const revertEarningsOverride = async (year: number, month: number) => {
    if (!user) return;
    const key = monthKey(year, month);
    const existing = earningsHistory[key];
    if (!existing?.override) return;
    const { override: _drop, ...rest } = existing;
    void _drop;
    const entry: MonthlyEarnings = { ...rest, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'userSettings', user.uid, 'earningsHistory', key), entry);
    setEarningsHistory((prev) => ({ ...prev, [key]: entry }));
  };

  return (
    <EarningsContext.Provider
      value={{
        earnings,
        earningsHistory,
        loading,
        getEarningsForMonth,
        setEarningsForMonth,
        revertEarningsOverride,
        refresh: load,
      }}
    >
      {children}
    </EarningsContext.Provider>
  );
};
