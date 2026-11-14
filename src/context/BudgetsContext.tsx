import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { cleanBudgets, type CategoryBudgets } from '../utils/budgets';

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

  const setBudget = useCallback(async (category: string, amount: number | null) => {
    if (!user) return;
    const next = { ...budgets };
    if (amount && amount > 0) next[category] = Math.round(amount * 100) / 100;
    else delete next[category];
    const prev = budgets;
    setBudgets(next);
    try {
      // mergeFields replaces just this map, so removed categories really go away
      // and every other setting on the document is left untouched.
      await setDoc(doc(db, 'userSettings', user.uid), { categoryBudgets: next }, { mergeFields: ['categoryBudgets'] });
    } catch (err) {
      console.error('Error saving budget:', err);
      setBudgets(prev);
      toast.error('Could not save the budget. Please try again.');
      throw err;
    }
  }, [user, budgets]);

  return (
    <BudgetsContext.Provider value={{ budgets, loading, setBudget }}>
      {children}
    </BudgetsContext.Provider>
  );
};
