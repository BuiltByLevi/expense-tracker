import { BulkWriteError } from './bulkWrite';
import { sumMoney } from './money';
import { statementOrderedDate } from './statementReview';
import type { ReviewTransaction } from './statementParsers/types';
import type { StatementImport } from './types';

// Limits enforced by firestore.rules (validTransaction). A single document
// that breaks one makes Firestore reject the whole batch it is in, so every
// record is brought within them before it is written.
const MAX_AMOUNT = 100_000_000_000;
const MAX_DESCRIPTION = 500;
const MAX_NARRATION = 1000;
const MAX_REFERENCE = 100;
const MAX_CATEGORY = 60;

/** A record ready to hand to addExpenses / addIncomes. */
export interface ImportRecord {
  amount: number;
  category: string;
  description: string;
  date: Date;
  source: 'import';
  importId: string;
  originalNarration: string;
  referenceNumber?: string;
}

export interface RejectedRow {
  rowId: string;
  reason: string;
}

export interface ImportPlan {
  expenses: ImportRecord[];
  incomes: ImportRecord[];
  /** Selected rows that cannot be saved, each with the reason. */
  rejected: RejectedRow[];
  /** Rows the user left unticked (duplicates, or by choice). */
  notSelected: number;
  /** Rows with no usable direction/date/amount that were never selectable. */
  unreadable: number;
  totalRows: number;
}

function rejectionReason(row: ReviewTransaction): string | null {
  if (row.type === null) return 'No withdrawal/deposit direction';
  if (row.date === null || Number.isNaN(row.date.getTime())) return 'No valid date';
  if (row.amount === null || !Number.isFinite(row.amount)) return 'No valid amount';
  if (row.amount <= 0) return 'Amount is zero';
  if (row.amount >= MAX_AMOUNT) return 'Amount is too large';
  // A deposit is never written as income until the user has said what it is.
  if (row.type === 'credit' && !row.category) return 'Choose a category for this deposit';
  if (row.type === 'credit' && row.category === 'Transfer' && row.uncertain) return 'Confirm the suggested category for this deposit';
  return null;
}

/**
 * Decides, row by row, what an import will write. Pure: the same rows always
 * give the same plan, and every row is accounted for —
 * expenses + incomes + rejected + notSelected + unreadable = totalRows.
 */
export function planImport(rows: ReviewTransaction[], importId: string): ImportPlan {
  const plan: ImportPlan = { expenses: [], incomes: [], rejected: [], notSelected: 0, unreadable: 0, totalRows: rows.length };

  for (const row of rows) {
    if (!row.included) {
      if (row.type === null || row.date === null || row.amount === null) plan.unreadable++;
      else plan.notSelected++;
      continue;
    }
    const reason = rejectionReason(row);
    if (reason) {
      plan.rejected.push({ rowId: row.rowId, reason });
      continue;
    }
    const narration = row.narration.slice(0, MAX_NARRATION);
    const reference = row.referenceNumber?.trim().slice(0, MAX_REFERENCE);
    const record: ImportRecord = {
      amount: row.amount as number,
      category: row.category.slice(0, MAX_CATEGORY),
      description: (row.description || row.narration).slice(0, MAX_DESCRIPTION),
      date: statementOrderedDate({ date: row.date as Date, sequence: row.sequence }),
      source: 'import',
      importId,
      originalNarration: narration,
      ...(reference ? { referenceNumber: reference } : {}),
    };
    (row.type === 'debit' ? plan.expenses : plan.incomes).push(record);
  }
  return plan;
}

export interface ImportOutcome {
  expensesImported: number;
  incomeImported: number;
  /** Total actually saved. */
  imported: number;
  /** Rows that were sent to the database and did not save. */
  failed: number;
  /** Selected rows that could not be sent (see ImportPlan.rejected). */
  rejected: number;
  notSelected: number;
  unreadable: number;
  /** Everything not saved, for the short "N skipped" line. */
  skipped: number;
  status: StatementImport['status'];
}

/** Saved count from a bulk add that either resolves (all saved) or throws. */
async function savedCount(count: number, write: () => Promise<unknown>): Promise<number> {
  if (count === 0) return 0;
  try {
    await write();
    return count;
  } catch (error) {
    if (error instanceof BulkWriteError) return error.result.written;
    return 0;
  }
}

/**
 * Runs a plan against the data layer and reports exactly what was saved.
 * Expenses and income are written independently: a failure in one never
 * hides the other, and a partly-saved import is reported as partial — never
 * as a success, and never as a total failure when rows did get through.
 */
export async function executeImport(
  plan: ImportPlan,
  writers: {
    addExpenses: (records: ImportRecord[]) => Promise<unknown>;
    addIncomes: (records: ImportRecord[]) => Promise<unknown>;
  }
): Promise<ImportOutcome> {
  const expensesImported = await savedCount(plan.expenses.length, () => writers.addExpenses(plan.expenses));
  const incomeImported = await savedCount(plan.incomes.length, () => writers.addIncomes(plan.incomes));
  const imported = expensesImported + incomeImported;
  const failed = plan.expenses.length + plan.incomes.length - imported;
  const rejected = plan.rejected.length;
  const notSaved = failed + rejected;

  return {
    expensesImported,
    incomeImported,
    imported,
    failed,
    rejected,
    notSelected: plan.notSelected,
    unreadable: plan.unreadable,
    skipped: plan.totalRows - imported,
    status: notSaved === 0 ? 'completed' : imported > 0 ? 'partial' : 'failed',
  };
}

/** Exact credit/debit totals of a statement's rows, for the import log. */
export function statementTotals(rows: Pick<ReviewTransaction, 'type' | 'amount'>[]): { creditsTotal: number; debitsTotal: number } {
  const of = (type: 'credit' | 'debit') => sumMoney(rows.filter((r) => r.type === type).map((r) => r.amount ?? 0));
  return { creditsTotal: of('credit'), debitsTotal: of('debit') };
}
