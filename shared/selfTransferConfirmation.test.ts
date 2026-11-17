import { describe, expect, it } from 'vitest';
import { suggestIncomeCategory } from './classification';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { planImport } from './statementImport';
import { assignCategory, buildReviewTransactions, needsCategory, needsConfirmation } from './statementReview';
import type { NormalizedTransaction } from './statementParsers/types';
import type { Income } from './types';

const txn = (narration: string, amount: number): NormalizedTransaction => ({
  date: new Date('2026-11-10T12:00:00Z'),
  valueDate: null,
  narration,
  referenceNumber: null,
  type: 'credit',
  amount,
  balance: null,
  parseIssue: null,
});

const OWN = 'IMPS/633212345004/SELF TRANSFER FROM SAVINGS';
const AMBIGUOUS = 'NEFT-N322260000777777-PERSON A';

describe('incoming own-account transfers: suggestion only, never final', () => {
  it('a high-confidence own-account credit is suggested as Transfer but marked uncertain', () => {
    const s = suggestIncomeCategory(OWN);
    expect(s.category).toBe('Transfer');
    expect(s.uncertain).toBe(true);
  });

  it('an ambiguous bare NEFT credit has no suggestion and stays pending a category', () => {
    expect(suggestIncomeCategory(AMBIGUOUS).category).toBeNull();
    const [row] = buildReviewTransactions([txn(AMBIGUOUS, 750)], [], []);
    expect(needsCategory(row)).toBe(true);
    expect(row.included).toBe(false);
  });

  it('the suggestion is pre-filled but not selected, and it stays visible in review', () => {
    const [row] = buildReviewTransactions([txn(OWN, 5000)], [], []);
    expect(row.category).toBe('Transfer');
    expect(row.included).toBe(false);
    expect(needsConfirmation(row)).toBe(true);
    expect(row.narration).toBe(OWN); // original statement narration preserved
  });

  it('an unconfirmed transfer is never imported and never counted as income', () => {
    const rows = buildReviewTransactions([txn(OWN, 5000)], [], []);
    const plan = planImport(rows, 'imp-1');
    expect(plan.incomes).toHaveLength(0);
    expect(plan.notSelected).toBe(1); // left for review, not discarded
  });

  it('confirming the suggestion selects it, and it can then be imported as Transfer', () => {
    const base = buildReviewTransactions([txn(OWN, 5000)], [], []);
    const rows = assignCategory(base, base[0].rowId, 'Transfer');
    expect(rows[0].included).toBe(true);
    expect(needsConfirmation(rows[0])).toBe(false);
    const plan = planImport(rows, 'imp-1');
    expect(plan.incomes).toHaveLength(1);
    expect(plan.incomes[0].category).toBe('Transfer');
  });

  it('changing the category to Other Income is also confirmation', () => {
    const base = buildReviewTransactions([txn(OWN, 5000)], [], []);
    const changed = assignCategory(base, base[0].rowId, 'Other Income');
    expect(changed[0].included).toBe(true);
    expect(changed[0].narration).toBe(OWN);
  });

  it('a transfer does not count toward Monthly Earnings even when stored', () => {
    const transfer: Income = {
      id: 'x', amount: 5000, category: 'Transfer', description: OWN,
      date: new Date('2026-11-10T12:00:00Z'), userId: 'u1', source: 'import',
    };
    expect(deriveMonthlyEarnings([transfer])?.amount ?? 0).toBe(0);
  });

  it('an unconfirmed transfer cannot reach the plan even when forced selected', () => {
    const rows = buildReviewTransactions([txn(OWN, 5000)], [], []).map((r) => ({ ...r, included: true }));
    const plan = planImport(rows, 'imp-1');
    expect(plan.incomes).toHaveLength(0);
    expect(plan.rejected[0].reason).toBe('Confirm the suggested category for this deposit');
  });
});
