import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './AuthContext';
import type { Income } from '@shared/types';

interface IncomeContextType {
  income: Income[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addIncome: (entry: Omit<Income, 'id' | 'userId'>) => Promise<void>;
  addIncomes: (entries: Omit<Income, 'id' | 'userId'>[]) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  getIncomeForMonth: (year: number, month: number) => { entries: Income[]; total: number };
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export const useIncome = () => {
  const context = useContext(IncomeContext);
  if (!context) throw new Error('useIncome must be used within an IncomeProvider');
  return context;
};

export const IncomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadIncome = useCallback(async () => {
    if (!user) {
      setIncome([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'income'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const rows: Income[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: new Date(data.date),
          userId: data.userid,
          source: data.source,
          importId: data.importId,
          originalNarration: data.originalNarration,
          referenceNumber: data.referenceNumber,
        } as Income;
      });
      rows.sort((a, b) => b.date.getTime() - a.date.getTime());
      setIncome(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  const toIncomeDoc = (entry: Omit<Income, 'id' | 'userId'>) => ({
    amount: entry.amount,
    category: entry.category,
    description: entry.description,
    userid: user!.uid,
    date: entry.date.toISOString(),
    ...(entry.source !== undefined && { source: entry.source }),
    ...(entry.importId !== undefined && { importId: entry.importId }),
    ...(entry.originalNarration !== undefined && { originalNarration: entry.originalNarration }),
    ...(entry.referenceNumber !== undefined && { referenceNumber: entry.referenceNumber }),
  });

  const addIncome = async (entry: Omit<Income, 'id' | 'userId'>) => {
    if (!user) return;
    await addDoc(collection(db, 'income'), toIncomeDoc(entry));
    await loadIncome();
  };

  const addIncomes = async (entries: Omit<Income, 'id' | 'userId'>[]) => {
    if (!user || entries.length === 0) return;
    const BATCH_LIMIT = 500;
    for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
      const chunk = entries.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        batch.set(doc(collection(db, 'income')), toIncomeDoc(entry));
      }
      await batch.commit();
    }
    await loadIncome();
  };

  const deleteIncome = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'income', id));
    await loadIncome();
  };

  // Local getters (`getFullYear`/`getMonth`), matching the web app — the
  // stored ISO string is read back in the device's timezone deliberately.
  const getIncomeForMonth = useCallback(
    (year: number, month: number) => {
      const entries = income.filter(
        (e) => e.date.getFullYear() === year && e.date.getMonth() === month
      );
      return { entries, total: entries.reduce((s, e) => s + e.amount, 0) };
    },
    [income]
  );

  return (
    <IncomeContext.Provider
      value={{
        income,
        loading,
        error,
        refresh: loadIncome,
        addIncome,
        addIncomes,
        deleteIncome,
        getIncomeForMonth,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
};
