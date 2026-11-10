import { useCallback, useEffect, useState } from 'react';
import { collection, addDoc, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import type { StatementImport } from '../types';

/** History of past statement imports (metadata only — the source file is never stored). */
export const useStatementImports = () => {
  const [imports, setImports] = useState<StatementImport[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadImports = useCallback(async () => {
    if (!user) {
      setImports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'statementImports'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const results: StatementImport[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          userId: data.userid,
          fileName: data.fileName,
          bankGuess: data.bankGuess,
          statementPeriodStart: data.statementPeriodStart,
          statementPeriodEnd: data.statementPeriodEnd,
          uploadedAt: data.uploadedAt,
          transactionsExtracted: data.transactionsExtracted,
          expensesImported: data.expensesImported,
          incomeImported: data.incomeImported,
          transactionsSkipped: data.transactionsSkipped,
          creditsTotal: data.creditsTotal,
          debitsTotal: data.debitsTotal,
          status: data.status,
        });
      });
      results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setImports(results);
    } catch (error) {
      console.error('Error loading statement imports:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  const recordImport = async (record: Omit<StatementImport, 'id' | 'userId'>) => {
    if (!user) return;
    await addDoc(collection(db, 'statementImports'), { ...record, userid: user.uid });
    await loadImports();
  };

  /** Permanently deletes all import history records (not the expenses/income
   *  they created) — used by "Delete All Expense Data" so stale history
   *  doesn't reference data that no longer exists. */
  const deleteAllImports = async () => {
    if (!user) return;
    const BATCH_LIMIT = 500;
    try {
      const q = query(collection(db, 'statementImports'), where('userid', '==', user.uid));
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map((d) => d.id);
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const chunk = ids.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'statementImports', id));
        }
        await batch.commit();
      }
      await loadImports();
    } catch (error) {
      console.error('Error deleting import history:', error);
      throw error;
    }
  };

  return { imports, loading, recordImport, deleteAllImports };
};
