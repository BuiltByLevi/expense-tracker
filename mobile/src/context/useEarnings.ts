import { createContext, useContext } from 'react';
import type { MonthlyEarnings } from '@shared/types';

export interface EarningsContextType {
  /** Default/fallback monthly figure (userSettings.monthlyEarnings). */
  earnings: number;
  earningsHistory: Record<string, MonthlyEarnings>;
  loading: boolean;
  getEarningsForMonth: (year: number, month: number) => MonthlyEarnings | null;
  setEarningsForMonth: (
    year: number,
    month: number,
    amount: number,
    status?: 'confirmed' | 'estimated',
    options?: { override?: boolean }
  ) => Promise<void>;
  /** Drops a month's manual override so it goes back to its imported total. */
  revertEarningsOverride: (year: number, month: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const EarningsContext = createContext<EarningsContextType | undefined>(undefined);

export const useEarnings = () => {
  const context = useContext(EarningsContext);
  if (!context) throw new Error('useEarnings must be used within an EarningsProvider');
  return context;
};
