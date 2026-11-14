import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
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
  setDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import type { Expense, CategoryTotal } from '../types';

interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>;
  addExpenses: (expenses: Omit<Expense, 'id' | 'userId'>[]) => Promise<void>;
  updateExpense: (id: string, updatedData: Partial<Expense>) => Promise<void>;
  /** Applies the same edit (e.g. a category) to many expenses in batched writes. */
  updateExpenses: (ids: string[], data: Partial<Pick<Expense, 'category'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** Puts back a just-deleted entry under its original id (used by Undo). */
  restoreExpense: (entry: Expense) => Promise<void>;
  /** Writes entries under fixed ids (recurring entries use one id per month, so repeats can't duplicate). */
  setExpensesWithIds: (entries: { id: string; data: Omit<Expense, 'id' | 'userId'> }[]) => Promise<void>;
  deleteAllExpenses: () => Promise<void>;
  getYearlyTotal: (year: number) => number;
  getCategoryAnalysis: () => CategoryTotal[];
  getMonthlyData: () => { month: string; total: number }[];
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

/**
 * Shared across the whole app (unlike a plain hook, which would give every
 * call site — Dashboard, Profile, Ledger, Statement Import — its own
 * isolated copy of the data). Without this, importing a bank statement in
 * one place wouldn't be visible anywhere else until a full reload.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
};

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Live: a Firestore listener keeps this list current, so changes made on
  // another device (or by a recurring rule) appear without a refresh.
  // State is tagged with the uid it belongs to, so a sign-out/sign-in never
  // shows the previous user's data and "loading" is derived, not stored.
  const [live, setLive] = useState<{ uid: string | null; items: Expense[] }>({ uid: null, items: [] });

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const q = query(collection(db, 'expenses'), where('userid', '==', uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Expense[] = snapshot.docs.map((d) => {
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
            recurringId: data.recurringId,
          } as Expense;
        });
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setLive({ uid, items });
      },
      (error) => {
        console.error('Error loading expenses:', error);
        setLive({ uid, items: [] });
      },
    );
  }, [user]);

  const expenses = user && live.uid === user.uid ? live.items : [];
  const loading = !!user && live.uid !== user.uid;

  /** Kept for callers that refresh after a write; the live listener already has the change. */
  const loadExpenses = async () => {};

  // Firestore rejects explicit `undefined` field values, so optional
  // traceability fields (source/importId/originalNarration/referenceNumber)
  // are only included when actually present.
  const toExpenseDoc = (expense: Omit<Expense, 'id' | 'userId'>) => ({
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
    userid: user!.uid,
    date: expense.date.toISOString(),
    ...(expense.source !== undefined && { source: expense.source }),
    ...(expense.importId !== undefined && { importId: expense.importId }),
    ...(expense.originalNarration !== undefined && { originalNarration: expense.originalNarration }),
    ...(expense.referenceNumber !== undefined && { referenceNumber: expense.referenceNumber }),
    ...(expense.recurringId !== undefined && { recurringId: expense.recurringId }),
  });

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'expenses'), toExpenseDoc(expense));
      await loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  /**
   * Writes many expenses in Firestore batches (max 500 writes/batch) and
   * reloads once at the end — used by bulk flows like bank statement import,
   * where calling addExpense() in a loop would mean one full collection
   * reload per row (fine for single manual entries, very slow for N rows).
   */
  const addExpenses = async (expenses: Omit<Expense, 'id' | 'userId'>[]) => {
    if (!user || expenses.length === 0) return;

    const BATCH_LIMIT = 500;
    try {
      for (let i = 0; i < expenses.length; i += BATCH_LIMIT) {
        const chunk = expenses.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const expense of chunk) {
          batch.set(doc(collection(db, 'expenses')), toExpenseDoc(expense));
        }
        await batch.commit();
      }
      await loadExpenses();
    } catch (error) {
      console.error('Error bulk-adding expenses:', error);
      throw error;
    }
  };

  const updateExpenses = async (ids: string[], data: Partial<Pick<Expense, 'category'>>) => {
    if (!user || ids.length === 0 || data.category === undefined) return;
    const BATCH_LIMIT = 500;
    try {
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const id of ids.slice(i, i + BATCH_LIMIT)) {
          batch.update(doc(db, 'expenses', id), { category: data.category });
        }
        await batch.commit();
      }
      await loadExpenses();
    } catch (error) {
      console.error('Error bulk-updating expenses:', error);
      throw error;
    }
  };

  const updateExpense = async (id: string, updatedData: Partial<Expense>) => {
    if (!user) return;

    try {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, {
        amount: updatedData.amount,
        category: updatedData.category,
        description: updatedData.description,
        date: updatedData.date?.toISOString()
      });

      await loadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'expenses', id));
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  /** Permanently deletes every expense for this user (batched). Used by the
   *  "Delete All Expense Data" account action — irreversible. */
  const deleteAllExpenses = async () => {
    if (!user) return;
    const BATCH_LIMIT = 500;
    try {
      const q = query(collection(db, 'expenses'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map((d) => d.id);
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const chunk = ids.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'expenses', id));
        }
        await batch.commit();
      }
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting all expenses:', error);
      throw error;
    }
  };

  const getYearlyTotal = (year: number) => {
    const yearExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === year;
    });
    return yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getCategoryAnalysis = () => {
    const categoryMap = new Map<string, number>();
    let total = 0;

    expenses.forEach(expense => {
      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) || 0) + expense.amount
      );
      total += expense.amount;
    });

    const analysis: CategoryTotal[] = [];
    categoryMap.forEach((amount, category) => {
      analysis.push({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      });
    });

    return analysis.sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyData = () => {
    const monthlyData: { [key: string]: number } = {};

    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const key = format(date, 'MMM yyyy');
      monthlyData[key] = (monthlyData[key] || 0) + expense.amount;
    });

    return Object.entries(monthlyData).map(([month, total]) => ({
      month,
      total
    }));
  };


  const restoreExpense = async (entry: Expense) => {
    if (!user) return;
    const { id, userId: _u, ...data } = entry;
    void _u;
    await setDoc(doc(db, 'expenses', id), toExpenseDoc({ ...data, date: new Date(entry.date) }));
    await loadExpenses();
  };

  const setExpensesWithIds = async (entries: { id: string; data: Omit<Expense, 'id' | 'userId'> }[]) => {
    if (!user || entries.length === 0) return;
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      for (const e of entries.slice(i, i + 500)) batch.set(doc(db, 'expenses', e.id), toExpenseDoc(e.data));
      await batch.commit();
    }
    await loadExpenses();
  };

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        loading,
        addExpense,
        addExpenses,
        updateExpense,
        updateExpenses,
        deleteExpense,
        restoreExpense,
        setExpensesWithIds,
        deleteAllExpenses,
        getYearlyTotal,
        getCategoryAnalysis,
        getMonthlyData,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};
