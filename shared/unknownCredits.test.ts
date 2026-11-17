import { describe, expect, it } from 'vitest';
import { assignCategory, assignRowType, buildReviewTransactions, needsCategory } from './statementReview';
import { executeImport, planImport, type ImportRecord } from './statementImport';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { resolveMonthlyEarnings } from './earningsResolution';
import { makeCashFlowLookup } from './cashFlowLookup';
import { computeFinanceTotals } from './finance';
import { entriesForMonth } from './monthFilter';
import { toTransactionDoc, fromTransactionDoc } from './transactionDoc';
import type { NormalizedTransaction } from './statementParsers/types';
import type { Expense, Income } from './types';

const credit = (narration: string, amount: number, day = 4): NormalizedTransaction => ({
  date: new Date(2026, 10, day), valueDate: null, narration, referenceNumber: null,
  type: 'credit', amount, balance: null, parseIssue: null,
});

/** A small store that remembers what the import wrote, as Firestore would. */
function store() {
  const expenses: Expense[] = [];
  const income: Income[] = [];
  const writers = {
    addExpenses: async (records: ImportRecord[]) => {
      expenses.push(...records.map((r, i) => ({ id: `e${expenses.length + i}`, userId: 'u', ...r })) as unknown as Expense[]);
    },
    addIncomes: async (records: ImportRecord[]) => {
      income.push(...records.map((r, i) => ({ id: `i${income.length + i}`, userId: 'u', ...r })) as unknown as Income[]);
    },
  };
  return { expenses, income, writers };
}

describe('an unrecognized NEFT/IMPS/RTGS credit', () => {
  const neft = 'NEFT-N999123456789-SOMEONE UNKNOWN';

  it('keeps the direction as credit, but has no category: not income, not Transfer, not Other Income', () => {
    const [row] = buildReviewTransactions([credit(neft, 1200)], [], []);
    expect(row.type).toBe('credit');
    expect(row.category).toBe('');
    expect(row.uncertain).toBe(true);
    expect(needsCategory(row)).toBe(true);
    expect(row.included).toBe(false);
  });

  it('is never imported while unclassified, even if someone selects it', async () => {
    const [row] = buildReviewTransactions([credit(neft, 1200)], [], []);
    const forced = { ...row, included: true };
    const plan = planImport([forced], 'imp');
    expect(plan.incomes).toEqual([]);
    expect(plan.rejected).toEqual([{ rowId: row.rowId, reason: 'Choose a category for this deposit' }]);
    const s = store();
    await executeImport(plan, s.writers);
    expect(s.income).toEqual([]);
  });

  it('a known salary, interest or refund narration is still categorized automatically', () => {
    const rows = buildReviewTransactions([credit('NEFT SALARY ACME', 50000), credit('INT.PD:01-08-2026 TO 31-10-2026', 15.5), credit('UPI REFUND 99', 300)], [], []);
    expect(rows.map((r) => r.category)).toEqual(['Salary', 'Interest', 'Refund']);
    expect(rows.every((r) => r.included)).toBe(true);
  });

  it('after the user classifies it, it is persisted under that category and counted in Monthly Earnings', async () => {
    let rows = buildReviewTransactions([credit(neft, 1200)], [], []);
    rows = assignCategory(rows, rows[0].rowId, 'Other Income');
    expect(rows[0].included).toBe(true);
    expect(needsCategory(rows[0])).toBe(false);

    const s = store();
    const outcome = await executeImport(planImport(rows, 'imp'), s.writers);
    expect(outcome.incomeImported).toBe(1);
    expect(s.income[0]).toMatchObject({ amount: 1200, category: 'Other Income', source: 'import' });

    // The saved record round-trips with its category intact.
    const doc = toTransactionDoc({ ...s.income[0], category: s.income[0].category }, 'u');
    expect(fromTransactionDoc('i0', doc as unknown as Record<string, unknown>).category).toBe('Other Income');

    const derived = deriveMonthlyEarnings(s.income);
    expect(derived!.amount).toBe(1200);
  });

  it('classified as Transfer or Refund, it is not earned income but still counts as cash in (refund) or not at all (transfer)', async () => {
    let rows = buildReviewTransactions([credit('NEFT-AAA-PERSON ONE', 2000, 4), credit('NEFT-BBB-PERSON TWO', 700, 6)], [], []);
    rows = assignCategory(rows, rows[0].rowId, 'Transfer');
    rows = assignCategory(rows, rows[1].rowId, 'Refund');
    const s = store();
    await executeImport(planImport(rows, 'imp'), s.writers);

    expect(deriveMonthlyEarnings(s.income)).toBeNull();
    const cash = makeCashFlowLookup((y, m) => entriesForMonth(s.income, y, m), () => null)(2026, 10)!;
    expect(cash.amount).toBe(700);
  });
});

describe('Monthly Earnings and dashboard totals after classification', () => {
  it('change as soon as the deposit is classified, and nothing before', async () => {
    const s = store();
    const salaryRows = buildReviewTransactions([credit('NEFT SALARY ACME', 50000, 1)], [], []);
    await executeImport(planImport(salaryRows, 'a'), s.writers);

    const incomeFor = (y: number, m: number) => entriesForMonth(s.income, y, m);
    const earningsBefore = resolveMonthlyEarnings(2026, 10, incomeFor(2026, 10).entries, null)!.amount;
    expect(earningsBefore).toBe(50000);

    // An unplaced deposit is held: earnings do not move.
    const held = buildReviewTransactions([credit('NEFT-ZZZ-UNKNOWN', 9000, 8)], [], []);
    await executeImport(planImport(held, 'b'), s.writers);
    expect(resolveMonthlyEarnings(2026, 10, incomeFor(2026, 10).entries, null)!.amount).toBe(50000);

    // Classified as Other Income: it imports now, and earnings and cash flow move together.
    const classified = assignCategory(held, held[0].rowId, 'Other Income');
    await executeImport(planImport(classified, 'c'), s.writers);
    expect(resolveMonthlyEarnings(2026, 10, incomeFor(2026, 10).entries, null)!.amount).toBe(59000);

    const totals = computeFinanceTotals([], s.income, 0, makeCashFlowLookup(incomeFor, () => null), 2026, 10);
    expect(totals.monthlySummaries.find((m) => m.month === 10)!.monthBalance).toBe(59000);
  });

  it('a manual override still beats the imported figure after classification', () => {
    const entries: Income[] = [
      { id: 'a', amount: 50000, category: 'Salary', description: 'S', date: new Date(2026, 10, 1), userId: 'u' },
      { id: 'b', amount: 1200, category: 'Other Income', description: 'O', date: new Date(2026, 10, 8), userId: 'u' },
    ];
    const override = { year: 2026, month: 10, amount: 40000, status: 'confirmed' as const, source: 'manual' as const, updatedAt: '', override: true };
    expect(resolveMonthlyEarnings(2026, 10, entries, override)!.amount).toBe(40000);
  });

  it('a reviewed row can be re-classified before import without leaving an orphan selection', () => {
    let rows = buildReviewTransactions([credit('NEFT-QQQ-SOMEONE', 300)], [], []);
    rows = assignRowType(rows, rows[0].rowId, 'credit', [], []);
    expect(needsCategory(rows[0])).toBe(true);
    expect(rows[0].included).toBe(false);
    rows = assignCategory(rows, rows[0].rowId, 'Refund');
    expect(rows[0].included).toBe(true);
    rows = assignCategory(rows, rows[0].rowId, 'Other Income');
    expect(rows[0].category).toBe('Other Income');
    expect(rows[0].included).toBe(true);
  });
});
