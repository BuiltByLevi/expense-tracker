import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { useExpenses } from './ExpensesContext';
import { useIncome } from './IncomeContext';
import { dueOccurrences, recurringEntryId, type RecurringRule } from '../utils/recurring';
import type { Expense, Income, IncomeCategory } from '../types';

export type NewRecurringRule = Omit<RecurringRule, 'id' | 'lastGenerated'>;

interface RecurringContextType {
  rules: RecurringRule[];
  loading: boolean;
  addRule: (rule: NewRecurringRule) => Promise<void>;
  updateRule: (id: string, changes: Partial<NewRecurringRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  /** Removes every rule (used by "Delete all data"). */
  deleteAllRules: () => Promise<void>;
}

const RecurringContext = createContext<RecurringContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useRecurring = () => {
  const ctx = useContext(RecurringContext);
  if (!ctx) throw new Error('useRecurring must be used within a RecurringProvider');
  return ctx;
};

/**
 * Monthly recurring expenses/income. Rules live in the `recurring`
 * collection; whenever the app loads (and whenever a rule is added or
 * resumed) any months that have come due are written as normal expenses or
 * income, each under a fixed per-month id so they can never be duplicated.
 * Deleting a created entry doesn't bring it back: the rule remembers the
 * last month it handled.
 */
export const RecurringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setExpensesWithIds } = useExpenses();
  const { setIncomesWithIds } = useIncome();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const ranFor = useRef<string | null>(null);

  /** Creates whatever is due for these rules, then records the month handled. */
  const generate = useCallback(async (targets: RecurringRule[], announce: boolean) => {
    const today = new Date();
    const expenses: { id: string; data: Omit<Expense, 'id' | 'userId'> }[] = [];
    const incomes: { id: string; data: Omit<Income, 'id' | 'userId'> }[] = [];
    const handled: { id: string; last: string }[] = [];

    for (const r of targets) {
      const due = dueOccurrences(r, today);
      if (due.length === 0) continue;
      for (const o of due) {
        const base = { amount: r.amount, description: r.description, date: o.date, source: 'recurring' as const, recurringId: r.id };
        const id = recurringEntryId(r.id, o.monthKey);
        if (r.kind === 'expense') expenses.push({ id, data: { ...base, category: r.category } });
        else incomes.push({ id, data: { ...base, category: r.category as IncomeCategory } });
      }
      handled.push({ id: r.id, last: due[due.length - 1].monthKey });
    }
    if (handled.length === 0) return;

    try {
      await setExpensesWithIds(expenses);
      await setIncomesWithIds(incomes);
      await Promise.all(handled.map((h) => updateDoc(doc(db, 'recurring', h.id), { lastGenerated: h.last })));
      setRules((prev) => prev.map((r) => {
        const h = handled.find((x) => x.id === r.id);
        return h ? { ...r, lastGenerated: h.last } : r;
      }));
      const n = expenses.length + incomes.length;
      if (announce) toast.success(`Added ${n} recurring ${n === 1 ? 'entry' : 'entries'}`);
    } catch (err) {
      console.error('Error creating recurring entries:', err);
      toast.error('Could not add recurring entries. They will be retried next time.');
    }
  }, [setExpensesWithIds, setIncomesWithIds]);

  // The data contexts hand out new function objects on every render, so the
  // load effect reads `generate` through a ref instead of depending on it.
  const generateRef = useRef(generate);
  useEffect(() => { generateRef.current = generate; }, [generate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setRules([]);
        setLoading(false);
        ranFor.current = null;
        return;
      }
      try {
        const snap = await getDocs(query(collection(db, 'recurring'), where('userid', '==', user.uid)));
        const loaded: RecurringRule[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id, kind: x.kind, amount: x.amount, category: x.category, description: x.description ?? '',
            dayOfMonth: x.dayOfMonth, startMonth: x.startMonth, endMonth: x.endMonth ?? null,
            active: x.active !== false, lastGenerated: x.lastGenerated ?? null,
          };
        });
        if (cancelled) return;
        setRules(loaded);
        // Catch up once per signed-in session.
        if (ranFor.current !== user.uid) {
          ranFor.current = user.uid;
          await generateRef.current(loaded, true);
        }
      } catch (err) {
        console.error('Error loading recurring rules:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const addRule = async (rule: NewRecurringRule) => {
    if (!user) return;
    const ref = await addDoc(collection(db, 'recurring'), {
      ...rule, userid: user.uid, lastGenerated: null, createdAt: new Date().toISOString(),
    });
    const created: RecurringRule = { ...rule, id: ref.id, lastGenerated: null };
    setRules((prev) => [...prev, created]);
    await generate([created], true);
  };

  const updateRule = async (id: string, changes: Partial<NewRecurringRule>) => {
    await updateDoc(doc(db, 'recurring', id), changes);
    const current = rules.find((r) => r.id === id);
    const updated = current ? { ...current, ...changes } : undefined;
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    // Resuming a paused rule catches up straight away.
    if (updated && changes.active) await generate([updated], true);
  };

  const deleteRule = async (id: string) => {
    await deleteDoc(doc(db, 'recurring', id));
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const deleteAllRules = async () => {
    if (!user) return;
    const snap = await getDocs(query(collection(db, 'recurring'), where('userid', '==', user.uid)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    setRules([]);
  };

  return (
    <RecurringContext.Provider value={{ rules, loading, addRule, updateRule, deleteRule, deleteAllRules }}>
      {children}
    </RecurringContext.Provider>
  );
};
