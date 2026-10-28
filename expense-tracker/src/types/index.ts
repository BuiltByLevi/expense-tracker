export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  userId: string;
}

export interface MonthlyEarnings {
  year: number;        // e.g. 2026
  month: number;       // 0-11 (JS Date convention)
  amount: number;      // rupees
  status: 'confirmed' | 'estimated';
  source: 'manual' | 'migrated';
  updatedAt: string;   // ISO string
}

export interface MonthlyExpense {
  month: string;
  year: number;
  total: number;
  categories: { [key: string]: number };
}

export interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
}

export type ExpenseCategory = 
  | 'Food & Dining'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Healthcare'
  | 'Education'
  | 'Rent'
  | 'Other';