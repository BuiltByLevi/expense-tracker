import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import type { Income } from '../types';

interface IncomeContextType {
  income: Income[];
  loading: boolean;
  addIncome: (entry: Omit<Income, 'id' | 'userId'>) => Promise<void>;
  addIncomes: (entries: Omit<Income, 'id' | 'userId'>[]) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  deleteAllIncome: () => Promise<void>;
  getIncomeForMonth: (year: number, month: number) => { entries: Income[]; total: number };
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

/**
 * Shared across the whole app for the same reason as ExpensesContext: a
 * plain hook would give the Dashboard, Statement Import, Ledger, and Profile
 * each their own isolated copy, so an import wouldn't be visible anywhere
 * else without a full reload.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useIncome = () => {
  const context = useContext(IncomeContext);
  if (!context) {
    throw new Error('useIncome must be used within an IncomeProvider');
  }
  return context;
};

export const IncomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadIncome = async () => {
    if (!user) {
      setIncome([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'income'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);

      const incomeData: Income[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        incomeData.push({
          id: doc.id,
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: new Date(data.date),
          userId: data.userid,
          source: data.source,
          importId: data.importId,
          originalNarration: data.originalNarration,
          referenceNumber: data.referenceNumber,
        } as Income);
      });

      incomeData.sort((a, b) => b.date.getTime() - a.date.getTime());
      setIncome(incomeData);
    } catch (error) {
      console.error('Error loading income:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncome();
  }, [user]);

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
    try {
      await addDoc(collection(db, 'income'), toIncomeDoc(entry));
      await loadIncome();
    } catch (error) {
      console.error('Error adding income:', error);
      throw error;
    }
  };

  /** Batched bulk write (see ExpensesContext.addExpenses for why this matters for imports). */
  const addIncomes = async (entries: Omit<Income, 'id' | 'userId'>[]) => {
    if (!user || entries.length === 0) return;
    const BATCH_LIMIT = 500;
    try {
      for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
        const chunk = entries.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const entry of chunk) {
          batch.set(doc(collection(db, 'income')), toIncomeDoc(entry));
        }
        await batch.commit();
      }
      await loadIncome();
    } catch (error) {
      console.error('Error bulk-adding income:', error);
      throw error;
    }
  };

  const deleteIncome = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'income', id));
      await loadIncome();
    } catch (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  };

  /** Permanently deletes every income entry for this user (batched). Used by
   *  the "Delete All Expense Data" account action — irreversible. */
  const deleteAllIncome = async () => {
    if (!user) return;
    const BATCH_LIMIT = 500;
    try {
      const q = query(collection(db, 'income'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map((d) => d.id);
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const chunk = ids.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'income', id));
        }
        await batch.commit();
      }
      await loadIncome();
    } catch (error) {
      console.error('Error deleting all income:', error);
      throw error;
    }
  };

  const getIncomeForMonth = (year: number, month: number) => {
    const entries = income.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month);
    const total = entries.reduce((sum, i) => sum + i.amount, 0);
    return { entries, total };
  };

  return (
    <IncomeContext.Provider
      value={{
        income,
        loading,
        addIncome,
        addIncomes,
        deleteIncome,
        deleteAllIncome,
        getIncomeForMonth,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
};
