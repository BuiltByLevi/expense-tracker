import { suggestCategory, suggestIncomeCategory } from './classification';
import { findDuplicate } from './duplicateDetection';
import type { NormalizedTransaction, ReviewTransaction } from './statementParsers/types';

/** Minimal shape of an already-stored expense/income row. */
export interface ExistingRecord {
  id: string;
  amount: number;
  date: Date;
  description: string;
  referenceNumber?: string;
}

/**
 * Turns parsed statement rows into review rows: classified, duplicate-checked,
 * and pre-selected only where the row can be placed confidently.
 *
 * Platform-independent and shared by the web app and the Expo app so both
 * apply identical classification and duplicate rules to the same statement.
 */
export function buildReviewTransactions(
  transactions: NormalizedTransaction[],
  existingExpenses: ExistingRecord[],
  existingIncome: ExistingRecord[]
): ReviewTransaction[] {
  return transactions.map((tx, idx) => {
    const { category, uncertain: categoryUncertain } =
      tx.type === 'credit' ? suggestIncomeCategory(tx.narration) : suggestCategory(tx.narration);

    const duplicate =
      tx.type === 'debit'
        ? findDuplicate(tx, existingExpenses, tx.referenceNumber)
        : tx.type === 'credit'
          ? findDuplicate(tx, existingIncome, tx.referenceNumber)
          : null;

    return {
      ...tx,
      rowId: `row-${idx}-${tx.date?.getTime() ?? 0}-${tx.amount ?? 0}`,
      category,
      description: tx.narration,
      isSalaryCandidate: tx.type === 'credit' && category === 'Salary',
      uncertain: categoryUncertain || !!tx.parseIssue || tx.type === null || tx.date === null,
      duplicateOf: duplicate?.duplicateOf ?? null,
      duplicateConfidence: duplicate?.confidence ?? null,
      // Don't pre-select rows we can't confidently place, or that look like duplicates.
      included: tx.type !== null && tx.date !== null && !duplicate,
    };
  });
}
