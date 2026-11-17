import type { NormalizedTransaction } from './statementParsers/types';

const paise = (n: number) => Math.round(n * 100);

export interface LedgerInput {
  date: Date;
  type: 'credit' | 'debit';
  amount: number;
}

export interface Statement<T> {
  openingBalance: number;
  totalCredit: number;
  totalDebit: number;
  closingBalance: number;
  rows: (T & { runningBalance: number })[];
}

/**
 * Lays entries out like a bank statement: oldest first, each row's balance is
 * the previous balance plus its deposit or minus its withdrawal, starting
 * from the opening balance. Sums are kept in paise so they never drift.
 */
export function buildStatement<T extends LedgerInput>(entries: T[], openingBalance: number): Statement<T> {
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.date.getTime() - b.entry.date.getTime() || a.index - b.index);

  let balance = paise(openingBalance);
  let credit = 0;
  let debit = 0;
  const rows = ordered.map(({ entry }) => {
    const amount = paise(entry.amount);
    if (entry.type === 'credit') {
      credit += amount;
      balance += amount;
    } else {
      debit += amount;
      balance -= amount;
    }
    return { ...entry, runningBalance: balance / 100 };
  });

  return {
    openingBalance: paise(openingBalance) / 100,
    totalCredit: credit / 100,
    totalDebit: debit / 100,
    closingBalance: balance / 100,
    rows,
  };
}

export interface StatementSummary {
  /** Balance before the first row, or null when the file prints no balances. */
  openingBalance: number | null;
  closingBalance: number | null;
  totalDebits: number;
  totalCredits: number;
  debitCount: number;
  creditCount: number;
  /** Rows whose withdrawal/deposit could not be determined. */
  unreadCount: number;
  /** opening + credits − debits = closing. Null when it cannot be checked. */
  reconciled: boolean | null;
  /** closing − (opening + credits − debits); 0 when reconciled. */
  difference: number;
}

/** Totals for an uploaded statement (rows oldest-first), plus the check a
 *  bank statement always satisfies, to prove nothing was misread or dropped. */
export function summarizeStatement(transactions: NormalizedTransaction[]): StatementSummary {
  let debits = 0;
  let credits = 0;
  let debitCount = 0;
  let creditCount = 0;
  let unreadCount = 0;
  for (const tx of transactions) {
    if (tx.type === 'debit' && tx.amount !== null) {
      debits += paise(tx.amount);
      debitCount++;
    } else if (tx.type === 'credit' && tx.amount !== null) {
      credits += paise(tx.amount);
      creditCount++;
    } else {
      unreadCount++;
    }
  }

  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const canCheck =
    !!first && first.balance !== null && first.amount !== null && first.type !== null && last.balance !== null;

  let openingBalance: number | null = null;
  let closingBalance: number | null = null;
  let reconciled: boolean | null = null;
  let difference = 0;
  if (canCheck) {
    const opening = paise(first.balance as number) + (first.type === 'debit' ? 1 : -1) * paise(first.amount as number);
    const closing = paise(last.balance as number);
    openingBalance = opening / 100;
    closingBalance = closing / 100;
    difference = (closing - (opening + credits - debits)) / 100;
    reconciled = difference === 0 && unreadCount === 0;
  }

  return {
    openingBalance,
    closingBalance,
    totalDebits: debits / 100,
    totalCredits: credits / 100,
    debitCount,
    creditCount,
    unreadCount,
    reconciled,
    difference,
  };
}
