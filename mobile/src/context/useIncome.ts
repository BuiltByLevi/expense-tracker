import { createContext, useContext } from 'react';
import type { Income } from '@shared/types';

export interface IncomeContextType {
  income: Income[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addIncome: (entry: Omit<Income, 'id' | 'userId'>) => Promise<void>;
  addIncomes: (entries: Omit<Income, 'id' | 'userId'>[]) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  getIncomeForMonth: (year: number, month: number) => { entries: Income[]; total: number };
}

export const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export const useIncome = () => {
  const context = useContext(IncomeContext);
  if (!context) throw new Error('useIncome must be used within an IncomeProvider');
  return context;
};
