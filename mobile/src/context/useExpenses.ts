import { createContext, useContext } from 'react';
import type { Expense } from '@shared/types';

export interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>;
  addExpenses: (expenses: Omit<Expense, 'id' | 'userId'>[]) => Promise<void>;
  updateExpense: (id: string, updatedData: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) throw new Error('useExpenses must be used within an ExpensesProvider');
  return context;
};
