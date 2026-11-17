import { suggestCategory, suggestIncomeCategory } from './classification';
import { findDuplicate, type DuplicateMatch } from './duplicateDetection';
import type { NormalizedTransaction, ReviewTransaction, TransactionType } from './statementParsers/types';

/** Minimal shape of an already-stored expense/income row. */
export interface ExistingRecord {
  id: string;
  amount: number;
  date: Date;
  description: string;
  originalNarration?: string;
  referenceNumber?: string;
}

/** Statements exported newest-first are flipped, so rows always run oldest-first. */
export function toChronological<T extends { date: Date | null }>(transactions: T[]): T[] {
  const dated = transactions.filter((t) => t.date !== null);
  if (dated.length < 2) return transactions;
  const first = dated[0].date as Date;
  const last = dated[dated.length - 1].date as Date;
  return first.getTime() > last.getTime() ? [...transactions].reverse() : transactions;
}

/** The date to store for an imported row: its statement date plus one second
 *  per earlier row that day, so same-day rows keep the bank's order when
 *  sorted — without needing an extra stored field. */
export function statementOrderedDate(row: { date: Date; sequence: number }): Date {
  return new Date(row.date.getTime() + Math.min(row.sequence, 86_399) * 1000);
}

/** True when a row has everything needed to be saved. */
export function isImportable(row: Pick<ReviewTransaction, 'type' | 'date' | 'amount'>): boolean {
  return row.type !== null && row.date !== null && row.amount !== null && row.amount > 0;
}

/** A row the statement clearly lists (date and amount were read) but whose
 *  direction couldn't be determined — the user decides in review, rather
 *  than the row being dropped. */
export function needsDirection(row: Pick<ReviewTransaction, 'type' | 'date' | 'amount'>): boolean {
  return row.type === null && row.date !== null && row.amount !== null && row.amount > 0;
}

/** A deposit whose category the user has not chosen yet. It is never
 *  assumed to be income, a transfer or a refund, so it is not selected for
 *  import until a category is picked. Debits always have a category
 *  ('Other' at worst). */
export function needsCategory(row: Pick<ReviewTransaction, 'type' | 'category'>): boolean {
  return row.type === 'credit' && !row.category;
}

function suggest(type: TransactionType | null, narration: string): { category: string; uncertain: boolean } {
  if (type === 'credit') {
    const { category, uncertain } = suggestIncomeCategory(narration);
    return { category: category ?? '', uncertain };
  }
  return suggestCategory(narration);
}

/** An own-account deposit suggested as a Transfer that the user has not
 *  confirmed. It stays visible in review but is never selected, so an
 *  unconfirmed transfer can't be imported or counted as income. Payout and
 *  other suggestions are not gated here. */
export function needsConfirmation(row: Pick<ReviewTransaction, 'type' | 'category' | 'uncertain'>): boolean {
  return row.type === 'credit' && row.category === 'Transfer' && row.uncertain;
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
  const ordered = toChronological(transactions);
  const pool = (tx: NormalizedTransaction) =>
    tx.type === 'debit' ? existingExpenses : tx.type === 'credit' ? existingIncome : null;

  // Duplicates are matched one-to-one: each stored record can account for at
  // most one statement row. Bank-reference matches are settled first so a
  // weaker text match can't claim the record a reference points at.
  const matched = new Map<NormalizedTransaction, DuplicateMatch>();
  const claimed = new Set<string>();
  for (const exactOnly of [true, false]) {
    for (const tx of ordered) {
      const records = pool(tx);
      if (!records || matched.has(tx)) continue;
      const match = findDuplicate(tx, records, tx.referenceNumber, { exclude: claimed, exactOnly });
      if (match) {
        matched.set(tx, match);
        claimed.add(match.duplicateOf);
      }
    }
  }

  const sameDayCount = new Map<string, number>();
  return ordered.map((tx, idx) => {
    const dayKey = tx.date ? `${tx.date.getFullYear()}-${tx.date.getMonth()}-${tx.date.getDate()}` : 'undated';
    const sequence = sameDayCount.get(dayKey) ?? 0;
    sameDayCount.set(dayKey, sequence + 1);

    const { category, uncertain: categoryUncertain } = suggest(tx.type, tx.narration);
    const duplicate = matched.get(tx) ?? null;

    const row: ReviewTransaction = {
      ...tx,
      rowId: `row-${idx}-${tx.date?.getTime() ?? 0}-${tx.amount ?? 0}`,
      sequence,
      category,
      description: tx.narration,
      isSalaryCandidate: tx.type === 'credit' && category === 'Salary',
      uncertain: categoryUncertain || !!tx.parseIssue || tx.type === null || tx.date === null,
      duplicateOf: duplicate?.duplicateOf ?? null,
      duplicateConfidence: duplicate?.confidence ?? null,
      included: false,
    };
    // Don't pre-select rows we can't confidently place, rows still waiting
    // for a deposit category or a confirmation, or rows that look like duplicates.
    row.included =
      tx.type !== null && tx.date !== null && tx.amount !== null && tx.amount > 0 && !duplicate &&
      !needsCategory(row) && !needsConfirmation(row);
    return row;
  });
}

/**
 * Applies the user's answer for a row whose direction the file didn't give:
 * the row is classified and duplicate-checked as that type, exactly as if
 * the statement had said so, and selected for import unless it looks like a
 * duplicate.
 */
export function assignRowType(
  rows: ReviewTransaction[],
  rowId: string,
  type: TransactionType,
  existingExpenses: ExistingRecord[],
  existingIncome: ExistingRecord[]
): ReviewTransaction[] {
  const claimed = new Set(rows.filter((r) => r.rowId !== rowId && r.duplicateOf).map((r) => r.duplicateOf as string));
  return rows.map((row) => {
    if (row.rowId !== rowId) return row;
    const typed = { ...row, type, parseIssue: null };
    const { category, uncertain } = suggest(type, row.narration);
    const duplicate = findDuplicate(typed, type === 'debit' ? existingExpenses : existingIncome, row.referenceNumber, { exclude: claimed });
    const next = {
      ...typed,
      category,
      isSalaryCandidate: type === 'credit' && category === 'Salary',
      uncertain,
      duplicateOf: duplicate?.duplicateOf ?? null,
      duplicateConfidence: duplicate?.confidence ?? null,
    };
    return { ...next, included: isImportable(next) && !duplicate && !needsCategory(next) && !needsConfirmation(next) };
  });
}

/**
 * Records the user's category for a row. A deposit that was waiting for a
 * category is selected for import as soon as it has one (unless it looks
 * like a duplicate); other rows keep their current selection.
 */
export function assignCategory(rows: ReviewTransaction[], rowId: string, category: string): ReviewTransaction[] {
  return rows.map((row) => {
    if (row.rowId !== rowId) return row;
    // Picking a category (even the suggested one) is the user's confirmation.
    const wasPending = needsCategory(row) || needsConfirmation(row);
    const next = { ...row, category, uncertain: false, isSalaryCandidate: row.type === 'credit' && category === 'Salary' };
    if (wasPending && !needsCategory(next)) {
      return { ...next, included: isImportable(next) && !next.duplicateOf };
    }
    return next;
  });
}
