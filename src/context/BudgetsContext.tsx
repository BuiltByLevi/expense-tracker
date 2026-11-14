import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { cleanBudgets, computeBudgetStatuses, type BudgetLevel, type CategoryBudgets } from '../utils/budgets';
import { useExpenses } from './ExpensesContext';

interface BudgetsContextType {
  budgets: CategoryBudgets;
  loading: boolean;
  /** Sets a category's monthly limit; null or 0 removes the budget. */
  setBudget: (category: string, amount: number | null) => Promise<void>;
}

const BudgetsContext = createContext<BudgetsContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useBudgets = () => {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error('useBudgets must be used within a BudgetsProvider');
  return ctx;
};

/**
 * Per-category monthly budgets, stored as one `categoryBudgets` map on the
 * user's existing userSettings document (already private to them).
 */
export const BudgetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<CategoryBudgets>({});
  const [loading, setLoading] = useState(true);
  // Latest map, so two quick saves build on each other instead of the second
  // overwriting the first with a stale copy.
  const latest = useRef<CategoryBudgets>({});
  useEffect(() => { latest.current = budgets; }, [budgets]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) { setBudgets({}); setLoading(false); }
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'userSettings', user.uid));
        if (!cancelled) setBudgets(cleanBudgets(snap.exists() ? snap.data().categoryBudgets : undefined));
      } catch (err) {
        console.error('Error loading budgets:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Warn when this month's spending pushes a category to 80% or over its
  // limit — whatever added it (typed, imported, or a recurring rule). Only
  // reacts to spending changes, not to editing a budget.
  const { expenses, loading: expensesLoading } = useExpenses();
  const seen = useRef<{ month: string; levels: Map<string, BudgetLevel>; expenses: unknown } | null>(null);
  useEffect(() => {
    if (loading || expensesLoading) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${now.getMonth()}`;
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const levels = new Map(computeBudgetStatuses(budgets, monthExpenses).map((s) => [s.category, s.level] as const));
    const prev = seen.current;
    const spendingChanged = !!prev && prev.month === month && prev.expenses !== expenses;
    if (spendingChanged) {
      const rank: Record<BudgetLevel, number> = { ok: 0, warning: 1, over: 2 };
      for (const st of computeBudgetStatuses(budgets, monthExpenses)) {
        const before = prev.levels.get(st.category) ?? 'ok';
        if (rank[st.level] <= rank[before]) continue;
        if (st.level === 'over') {
          toast.error(`${st.category} is over budget by ₹${Math.round(-st.remaining).toLocaleString('en-IN')} this month`, { duration: 5000, id: `budget-${st.category}` });
        } else {
          toast(`⚠ ${st.category}: ${Math.round(st.percent)}% of this month's budget used`, { duration: 5000, id: `budget-${st.category}` });
        }
      }
    }
    seen.current = { month, levels, expenses };
  }, [expenses, expensesLoading, budgets, loading]);

  const setBudget = useCallback(async (category: string, amount: number | null) => {
    if (!user) return;
    const prev = latest.current;
    const next = { ...prev };
    if (amount && amount > 0) next[category] = Math.round(amount * 100) / 100;
    else delete next[category];
    latest.current = next;
    setBudgets(next);
    try {
      // mergeFields replaces just this map, so removed categories really go away
      // and every other setting on the document is left untouched.
      await setDoc(doc(db, 'userSettings', user.uid), { categoryBudgets: next }, { mergeFields: ['categoryBudgets'] });
    } catch (err) {
      console.error('Error saving budget:', err);
      latest.current = prev;
      setBudgets(prev);
      toast.error('Could not save the budget. Please try again.');
      throw err;
    }
  }, [user]);

  return (
    <BudgetsContext.Provider value={{ budgets, loading, setBudget }}>
      {children}
    </BudgetsContext.Provider>
  );
};
