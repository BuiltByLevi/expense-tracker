import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from './useAuth';
import type { Expense } from '@shared/types';
import { BulkWriteError, commitInChunks } from '@shared/bulkWrite';
import { ExpensesContext } from './useExpenses';

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
    // Async Firestore fetch: setLoading(true) runs before its first await by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Ids are chosen up front so a retried batch can't add copies.
    const writes = rows.map((item) => ({ ref: doc(collection(db, 'expenses')), data: toExpenseDoc(item) }));
    const result = await commitInChunks(writes, async (chunk) => {
      const batch = writeBatch(db);
      for (const write of chunk) batch.set(write.ref, write.data);
      await batch.commit();
    });
    await loadExpenses();
    if (result.failed > 0) throw new BulkWriteError(result);
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
