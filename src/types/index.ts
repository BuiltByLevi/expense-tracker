export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  userId: string;
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