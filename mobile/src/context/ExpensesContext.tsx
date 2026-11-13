import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './AuthContext';
import type { Expense } from '@shared/types';

interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>;
  addExpenses: (expenses: Omit<Expense, 'id' | 'userId'>[]) => Promise<void>;
  updateExpense: (id: string, updatedData: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) throw new Error('useExpenses must be used within an ExpensesProvider');
  return context;
};

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // NOTE: the Firestore field is `userid` (all lowercase) while the TS model
  // uses `userId`. That mismatch is load-bearing — it is what the deployed
  // web app and the security rules already use. Do not "fix" it.
  const loadExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'expenses'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const rows: Expense[] = snapshot.docs.map((d) => {
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
        } as Expense;
      });
      rows.sort((a, b) => b.date.getTime() - a.date.getTime());
      setExpenses(rows);
    } catch (err) {
      // Surfaced in the UI rather than swallowed — a silent empty list reads
      // as "no expenses" when it actually means "offline / permission denied".
      setError(err instanceof Error ? err.message : 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Firestore rejects explicit `undefined`, so optional traceability fields
  // are only spread in when actually present.
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
  });

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!user) return;
    await addDoc(collection(db, 'expenses'), toExpenseDoc(expense));
    await loadExpenses();
  };

  /** Batched bulk write (Firestore caps a batch at 500) for statement import. */
  const addExpenses = async (rows: Omit<Expense, 'id' | 'userId'>[]) => {
    if (!user || rows.length === 0) return;
    const BATCH_LIMIT = 500;
    for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
      const chunk = rows.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const row of chunk) {
        batch.set(doc(collection(db, 'expenses')), toExpenseDoc(row));
      }
      await batch.commit();
    }
    await loadExpenses();
  };

  const updateExpense = async (id: string, updatedData: Partial<Expense>) => {
    if (!user) return;
    await updateDoc(doc(db, 'expenses', id), {
      amount: updatedData.amount,
      category: updatedData.category,
      description: updatedData.description,
      date: updatedData.date?.toISOString(),
    });
    await loadExpenses();
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'expenses', id));
    await loadExpenses();
  };

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        loading,
        error,
        refresh: loadExpenses,
        addExpense,
        addExpenses,
        updateExpense,
        deleteExpense,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};
