import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { BulkWriteError } from '../../shared/bulkWrite';
import { addTransactionDocs } from '../utils/firestoreBulk';
import { fromTransactionDoc, toTransactionDoc } from '../../shared/transactionDoc';
import { entriesForMonth } from '../../shared/monthFilter';
import type { Income } from '../types';

interface IncomeContextType {
  income: Income[];
  loading: boolean;
  addIncome: (entry: Omit<Income, 'id' | 'userId'>) => Promise<void>;
  addIncomes: (entries: Omit<Income, 'id' | 'userId'>[]) => Promise<void>;
  /** Edits one income entry — including entries saved from a statement import. */
  updateIncome: (id: string, data: Partial<Pick<Income, 'amount' | 'category' | 'description' | 'date'>>) => Promise<void>;
  /** Applies the same edit (e.g. a category) to many entries in batched writes. */
  updateIncomes: (ids: string[], data: Partial<Pick<Income, 'category'>>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  /** Puts back a just-deleted entry under its original id (used by Undo). */
  restoreIncome: (entry: Income) => Promise<void>;
  /** Writes entries under fixed ids (recurring entries use one id per month, so repeats can't duplicate). */
  setIncomesWithIds: (entries: { id: string; data: Omit<Income, 'id' | 'userId'> }[]) => Promise<void>;
  deleteAllIncome: () => Promise<void>;
  getIncomeForMonth: (year: number, month: number) => { entries: Income[]; total: number };
}

/** Firestore rejects `undefined`, so only fields actually provided are written. */
function editableFields<T extends { amount?: number; category?: string; description?: string; date?: Date }>(data: T) {
  return {
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.date !== undefined && { date: data.date.toISOString() }),
  };
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
  const { user } = useAuth();
  // Live: a Firestore listener keeps this list current, so changes made on
  // another device (or by a recurring rule) appear without a refresh.
  // State is tagged with the uid it belongs to, so a sign-out/sign-in never
  // shows the previous user's data and "loading" is derived, not stored.
  const [live, setLive] = useState<{ uid: string | null; items: Income[] }>({ uid: null, items: [] });

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const q = query(collection(db, 'income'), where('userid', '==', uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Income[] = snapshot.docs.map((d) => fromTransactionDoc(d.id, d.data()) as Income);
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setLive({ uid, items });
      },
      (error) => {
        console.error('Error loading income:', error);
        setLive({ uid, items: [] });
      },
    );
  }, [user]);

  const income = user && live.uid === user.uid ? live.items : [];
  const loading = !!user && live.uid !== user.uid;

  /** Kept for callers that refresh after a write; the live listener already has the change. */
  const loadIncome = async () => {};

  const toIncomeDoc = (entry: Omit<Income, 'id' | 'userId'>) => toTransactionDoc(entry, user!.uid);

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

    const result = await addTransactionDocs(db, 'income', user.uid, entries);
    await loadIncome();
    if (result.failed > 0) {
      console.error('Error bulk-adding income:', result.error);
      // Carries the exact saved/failed counts for the caller to report.
      throw new BulkWriteError(result);
    }
  };

  // Import traceability (source, importId, originalNarration, reference) is
  // deliberately left untouched, so an edited imported entry still shows
  // where it came from and still participates in duplicate detection.
  const updateIncome = async (
    id: string,
    data: Partial<Pick<Income, 'amount' | 'category' | 'description' | 'date'>>
  ) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'income', id), editableFields(data));
      await loadIncome();
    } catch (error) {
      console.error('Error updating income:', error);
      throw error;
    }
  };

  const updateIncomes = async (ids: string[], data: Partial<Pick<Income, 'category'>>) => {
    if (!user || ids.length === 0) return;
    const BATCH_LIMIT = 500;
    try {
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const id of ids.slice(i, i + BATCH_LIMIT)) {
          batch.update(doc(db, 'income', id), editableFields(data));
        }
        await batch.commit();
      }
      await loadIncome();
    } catch (error) {
      console.error('Error bulk-updating income:', error);
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

  const getIncomeForMonth = (year: number, month: number) => entriesForMonth(income, year, month);


  const restoreIncome = async (entry: Income) => {
    if (!user) return;
    const { id, userId: _u, ...data } = entry;
    void _u;
    await setDoc(doc(db, 'income', id), toIncomeDoc({ ...data, date: new Date(entry.date) }));
    await loadIncome();
  };

  const setIncomesWithIds = async (entries: { id: string; data: Omit<Income, 'id' | 'userId'> }[]) => {
    if (!user || entries.length === 0) return;
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      for (const e of entries.slice(i, i + 500)) batch.set(doc(db, 'income', e.id), toIncomeDoc(e.data));
      await batch.commit();
    }
    await loadIncome();
  };

  return (
    <IncomeContext.Provider
      value={{
        income,
        loading,
        addIncome,
        addIncomes,
        updateIncome,
        updateIncomes,
        deleteIncome,
        restoreIncome,
        setIncomesWithIds,
        deleteAllIncome,
        getIncomeForMonth,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
};
