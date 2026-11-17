import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from './useAuth';
import type { Income } from '@shared/types';
import { BulkWriteError, commitInChunks } from '@shared/bulkWrite';
import { entriesForMonth } from '@shared/monthFilter';
import { IncomeContext } from './useIncome';

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
    // Async Firestore fetch: setLoading(true) runs before its first await by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Ids are chosen up front so a retried batch can't add copies.
    const writes = entries.map((item) => ({ ref: doc(collection(db, 'income')), data: toIncomeDoc(item) }));
    const result = await commitInChunks(writes, async (chunk) => {
      const batch = writeBatch(db);
      for (const write of chunk) batch.set(write.ref, write.data);
      await batch.commit();
    });
    await loadIncome();
    if (result.failed > 0) throw new BulkWriteError(result);
  };

  const deleteIncome = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'income', id));
    await loadIncome();
  };

  // Local getters (`getFullYear`/`getMonth`), matching the web app — the
  // stored ISO string is read back in the device's timezone deliberately.
  const getIncomeForMonth = useCallback(
    (year: number, month: number) => entriesForMonth(income, year, month),
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
