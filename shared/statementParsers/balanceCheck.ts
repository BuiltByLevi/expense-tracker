import { toPaise } from '../money';
import type { NormalizedTransaction } from './types';

export const BALANCE_MISMATCH = "The balance printed on this row doesn't match the amount — please verify";

export interface BalanceCheckOptions {
  /** Balance before the first row, when the statement prints one. */
  openingBalance?: number | null;
  /** Flag rows whose stated direction contradicts the running balance. */
  flagMismatches?: boolean;
}

/**
 * Walks rows oldest-first the way a statement does: each balance must be the
 * previous balance minus the withdrawal or plus the deposit. Fills in a
 * direction the columns couldn't give (rows listed in `needsDirection`), and
 * optionally flags rows that don't add up. Mutates the transactions.
 * Returns how many rows contradicted their balance.
 */
export function reconcileBalances(
  transactions: NormalizedTransaction[],
  needsDirection: ReadonlySet<NormalizedTransaction>,
  options: BalanceCheckOptions = {}
): number {
  let previous: number | null = options.openingBalance != null ? toPaise(options.openingBalance) : null;
  let mismatches = 0;
  for (const tx of transactions) {
    if (tx.amount !== null && tx.balance !== null && previous !== null) {
      const amount = toPaise(tx.amount);
      const balance = toPaise(tx.balance);
      const fitsDebit = previous - amount === balance;
      const fitsCredit = previous + amount === balance;
      if (tx.type === null && needsDirection.has(tx)) {
        if (fitsDebit !== fitsCredit) {
          tx.type = fitsDebit ? 'debit' : 'credit';
          tx.parseIssue = null;
        }
      } else if (tx.type !== null && !(tx.type === 'debit' ? fitsDebit : fitsCredit)) {
        mismatches++;
        if (options.flagMismatches) tx.parseIssue = tx.parseIssue ?? BALANCE_MISMATCH;
      }
    }
    if (tx.balance !== null) previous = toPaise(tx.balance);
  }
  return mismatches;
}
