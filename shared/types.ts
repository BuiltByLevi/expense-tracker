export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  userId: string;
  // Traceability for expenses created via bank statement import — optional so
  // existing manually-entered expenses (which lack these) keep working.
  source?: 'manual' | 'import';
  importId?: string;
  originalNarration?: string;
  referenceNumber?: string;
}

export const INCOME_CATEGORIES = [
  'Salary',
  'Interest',
  'Refund',
  'Transfer',
  'Other Income',
] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number];

export interface Income {
  id: string;
  amount: number;
  category: IncomeCategory;
  description: string;
  date: Date;
  userId: string;
  // Traceability for income created via bank statement import — optional so
  // manually-entered income (if any) keeps working without these.
  source?: 'manual' | 'import';
  importId?: string;
  originalNarration?: string;
  referenceNumber?: string;
}

export interface MonthlyEarnings {
  year: number;        // e.g. 2026
  month: number;       // 0-11 (JS Date convention)
  amount: number;      // rupees
  status: 'confirmed' | 'estimated';
  // 'import' = derived live from that month's itemized income transactions
  // (see useDashboardData's getEffectiveEarningsRecord), not stored as-is.
  source: 'manual' | 'migrated' | 'import';
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

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Rent',
  'Groceries',
  'Fuel',
  'EMI & Loans',
  'Insurance',
  'Investments',
  'Cash Withdrawal',
  'Bank Charges',
  'Transfers',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface StatementImport {
  id: string;
  userId: string;
  fileName: string;
  bankGuess: string | null;
  statementPeriodStart: string | null; // ISO date
  statementPeriodEnd: string | null;   // ISO date
  uploadedAt: string;                  // ISO datetime
  transactionsExtracted: number;
  expensesImported: number;
  incomeImported: number;
  transactionsSkipped: number;
  creditsTotal: number;
  debitsTotal: number;
  status: 'completed' | 'partial' | 'failed';
}