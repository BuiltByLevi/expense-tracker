import { describe, expect, it } from 'vitest';
import { suggestCategory, suggestIncomeCategory } from './classification';
import { findDuplicate } from './duplicateDetection';
import { buildReviewTransactions } from './statementReview';
import { BulkWriteError, commitInChunks, commitInChunksOrThrow } from './bulkWrite';
import { executeImport, planImport } from './statementImport';
import { fromTransactionDoc, toTransactionDoc } from './transactionDoc';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { resolveMonthlyEarnings } from './earningsResolution';
import { makeCashFlowLookup } from './cashFlowLookup';
import { entriesForMonth } from './monthFilter';
import { roundMoney, sumMoney, toPaise } from './money';
import { passesTransactionRules } from './testFixtures/statementFixture';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Income, type MonthlyEarnings } from './types';
import type { NormalizedTransaction, ReviewTransaction } from './statementParsers/types';

const tx = (over: Partial<NormalizedTransaction> = {}): NormalizedTransaction => ({
  date: new Date(2026, 10, 10), valueDate: null, narration: 'UPI/SHOP', referenceNumber: null,
  type: 'debit', amount: 100, balance: null, parseIssue: null, ...over,
});
const stored = (over: Partial<{ id: string; amount: number; date: Date; description: string; referenceNumber: string; originalNarration: string }> = {}) => ({
  id: 'r1', amount: 100, date: new Date(2026, 10, 10), description: 'UPI/SHOP', ...over,
});

describe('credit classification', () => {
  it.each([
    'RAZORPAY PAYMENTS CREDIT',
    'RAZORPAY SETTLEMENT',
    'RAZORPAY PAYOUT 12345',
    'NEFT-N307260000123456-RAZORPAY SOFTWARE PVT LTD',
    'IMPS/630912345678/RAZORPAY SOFTWARE PRIVATE LIMITED',
    'RTGS-RZPX PRIVATE LIMITED-ESCROW',
    'PAYLOAD PAYMENT',
    'PAYLOAD SETTLEMENT',
    'NEFT-N311260000654321-PAYLOAD TECHNOLOGIES',
    'IMPS/631012345678/PAYLOAD/SETTLEMENT',
  ])('%s is earned income, even when it arrives by NEFT/IMPS/RTGS', (narration) => {
    expect(suggestIncomeCategory(narration).category).toBe('Other Income');
  });

  it.each([
    ['SALARY NOV 2026 ACME', 'Salary'],
    ['NEFT-HDFCN52026110100001-ACME-SALARY', 'Salary'],
    ['RZPX PVT LTD PAYROLL COMPLIANCE ESCROW ACCOUNT', 'Salary'],
    ['INT.PD:01-08-2026 TO 31-10-2026', 'Interest'],
    ['SAVINGS INTEREST CREDITED', 'Interest'],
    ['UPI/632912345003/AMAZON REFUND', 'Refund'],
    ['RAZORPAY REFUND ORDER 991', 'Refund'],
    ['UPI REVERSAL 631412345001', 'Refund'],
    ['CASHBACK CREDITED', 'Refund'],
    ['IMPS/633212345004/SELF TRANSFER FROM SAVINGS', 'Transfer'],
    ['FUND TRANSFER FROM OWN ACCOUNT', 'Transfer'],
    ['SWEEP IN FROM FD 1234', 'Transfer'],
    ['NEFT-N999-SOMEONE UNKNOWN', null],
    ['UPI/CR/631412345009/JOHN', null],
    ['CASH DEPOSIT BY SELF', null],
    ['SOMETHING NEVER SEEN BEFORE', null],
    ['', null],
  ] as const)('%s -> %s', (narration, category) => {
    expect(suggestIncomeCategory(narration).category).toBe(category);
  });

  it('only ever returns an income category, and flags the ones it is unsure of', () => {
    for (const n of ['UPI ATM WDL', 'EMI 123', 'NETFLIX', 'POS AMAZON', 'ELECTRICITY BILL', 'XYZ']) {
      const category = suggestIncomeCategory(n).category;
      // null = unplaced, waiting for the user; otherwise a real income category.
      if (category !== null) expect(INCOME_CATEGORIES).toContain(category);
    }
    expect(suggestIncomeCategory('SOMETHING NEVER SEEN BEFORE').uncertain).toBe(true);
    expect(suggestIncomeCategory('NEFT-N999-SOMEONE UNKNOWN').uncertain).toBe(true);
    expect(suggestIncomeCategory('NEFT-N999-SOMEONE UNKNOWN').category).toBeNull();
    expect(suggestIncomeCategory('SALARY').uncertain).toBe(false);
  });
});

describe('debit classification', () => {
  it.each([
    ['UPI/631412345001/BIGBASKET/GROCERY', 'Groceries'],
    ['UPI/631912345002/RAMESH KUMAR/PAYMENT', 'Other'],
    ['ATM WDL 00123 PUNE', 'Cash Withdrawal'],
    ['ATM-CASH-0456 MUMBAI', 'Cash Withdrawal'],
    ['ATW-4567XXXX1234-MUMBAI', 'Cash Withdrawal'],
    ['NWD-4567XXXX1234-PUNE', 'Cash Withdrawal'],
    ['CASH WITHDRAWAL SELF', 'Cash Withdrawal'],
    ['POS 4567XXXXXXXX1234 AMAZON SHOPPING', 'Shopping'],
    ['POS 4567XXXXXXXX1234 CITY MEDICO', 'Other'],
    ['NEFT-N322260000777777-SUNRISE ENTERPRISES', 'Other'],
    ['IMPS/631012345678/TO JOHN', 'Other'],
    ['IMPS/631012345679/SELF TRANSFER TO SAVINGS', 'Transfers'],
    ['RTGS-UTIBR52026111200001-BUILDER', 'Other'],
    ['NETFLIX SUBSCRIPTION', 'Entertainment'],
    ['BILLPAY-ELECTRICITY BILL MSEDCL', 'Bills & Utilities'],
    ['SMS ALERT CHARGES Q2', 'Bank Charges'],
    ['DEBIT CARD ANNUAL FEE', 'Bank Charges'],
    ['MIN BAL NON MAINTENANCE CHARGE', 'Bank Charges'],
    ['EMI 123456 HOME LOAN', 'EMI & Loans'],
    ['ACH D- HDFC LTD 99887766', 'EMI & Loans'],
    ['NACH DEBIT BAJAJ FINANCE', 'EMI & Loans'],
    ['LOAN REPAYMENT 4411', 'EMI & Loans'],
    ['SOMETHING NEVER SEEN BEFORE', 'Other'],
  ] as const)('%s -> %s', (narration, category) => {
    expect(suggestCategory(narration).category).toBe(category);
  });

  it('only ever returns an expense category, whatever income words the narration contains', () => {
    for (const n of ['SALARY PAID TO STAFF', 'RAZORPAY PAYMENT GATEWAY FEE', 'PAYLOAD CHARGEBACK', 'REFUND TO CUSTOMER', 'INTEREST DEBIT', 'TRANSFER FROM']) {
      expect(EXPENSE_CATEGORIES).toContain(suggestCategory(n).category);
    }
  });
});

describe('the statement decides direction; narration only picks the category within it', () => {
  it('a debit that reads like income is stored as an expense; a deposit that reads like spending waits for a category', () => {
    const review = buildReviewTransactions(
      [
        tx({ type: 'debit', narration: 'RAZORPAY SALARY SETTLEMENT PAYOUT', amount: 900 }),
        tx({ type: 'credit', narration: 'UPI ATM WDL POS EMI NETFLIX', amount: 800 }),
      ],
      [], []
    );
    expect(review[0].type).toBe('debit');
    expect(EXPENSE_CATEGORIES).toContain(review[0].category);
    expect(review[0].isSalaryCandidate).toBe(false);
    expect(review[1].type).toBe('credit');
    expect(review[1].category).toBe('');

    const plan = planImport(review, 'i');
    expect(plan.expenses.map((e) => e.amount)).toEqual([900]);
    expect(plan.incomes).toEqual([]);
    expect(plan.rejected).toEqual([]);
    expect(plan.notSelected).toBe(1);
  });

  it('unknown debits are imported for review; an unplaced deposit is held until classified, never skipped', () => {
    const review = buildReviewTransactions(
      [tx({ type: 'debit', narration: 'ZZ9 PLURAL Z ALPHA' }), tx({ type: 'credit', narration: 'QWERTY 12345', amount: 5 }), tx({ type: 'debit', narration: '(no description)', amount: 7 })],
      [], []
    );
    expect(review.map((r) => [r.included, r.uncertain, r.category])).toEqual([[true, true, 'Other'], [false, true, ''], [true, true, 'Other']]);
  });
});

describe('duplicate detection', () => {
  it('placeholder references never make two rows "the same transaction"', () => {
    const existing = [stored({ id: 'old', amount: 5, date: new Date(2026, 5, 1), description: 'OLD THING', referenceNumber: '0000000000000000' })];
    expect(findDuplicate(tx({ narration: 'POS NEW STORE', amount: 999 }), existing, '0000000000000000')).toBeNull();
    expect(findDuplicate(tx({ narration: 'POS NEW STORE', amount: 999 }), existing, '-')).toBeNull();
  });

  it('matching reference + amount is exact, across formats that pad the reference differently', () => {
    const existing = [stored({ referenceNumber: '0000631412345001' })];
    expect(findDuplicate(tx(), existing, '631412345001')).toEqual({ duplicateOf: 'r1', confidence: 'exact' });
  });

  it('a reference shared by two legs of different amounts (a charge and its GST) is two transactions', () => {
    const existing = [stored({ amount: 100, referenceNumber: 'CHG20261110' })];
    expect(findDuplicate(tx({ amount: 18 }), existing, 'CHG20261110')).toBeNull();
  });

  it('different references mean different transactions even when everything else matches', () => {
    const existing = [stored({ referenceNumber: '631412345001' })];
    expect(findDuplicate(tx(), existing, '631412345002')).toBeNull();
  });

  it('a short cheque number reused in another year is not a duplicate', () => {
    const existing = [stored({ referenceNumber: '000123', date: new Date(2024, 2, 1) })];
    expect(findDuplicate(tx(), existing, '123')).toBeNull();
    expect(findDuplicate(tx({ date: new Date(2024, 2, 2) }), existing, '123')?.confidence).toBe('exact');
  });

  it('without references: same amount and day needs the narration to agree too', () => {
    expect(findDuplicate(tx({ narration: 'UPI/SWIGGY/ORDER' }), [stored({ description: 'UPI SWIGGY ORDER' })], null)?.confidence).toBe('likely');
    expect(findDuplicate(tx({ narration: 'UPI/JANE DOE' }), [stored({ description: 'UPI/JOHN ROE' })], null)).toBeNull();
    expect(findDuplicate(tx({ narration: 'NEFT TO LANDLORD' }), [stored({ description: 'NEFT TO PLUMBER' })], null)).toBeNull();
  });

  it('an entry the user renamed is still recognised by the bank\'s original wording', () => {
    const existing = [stored({ description: 'Groceries run', originalNarration: 'UPI/631412345001/BIGBASKET/GROCERY' })];
    expect(findDuplicate(tx({ narration: 'UPI/631412345001/BIGBASKET/GROCERY' }), existing, null)?.confidence).toBe('likely');
  });

  it('amount alone, or amount + date alone, is never enough', () => {
    expect(findDuplicate(tx({ narration: 'BUS FARE' }), [stored({ description: 'LUNCH' })], null)).toBeNull();
    expect(findDuplicate(tx({ date: new Date(2026, 10, 20) }), [stored()], null)).toBeNull();
  });

  it('debits are only compared with expenses and credits only with income', () => {
    const sameLooking = [stored({ referenceNumber: '631412345001' })];
    const review = buildReviewTransactions(
      [tx({ type: 'credit', referenceNumber: '631412345001' }), tx({ type: 'debit', referenceNumber: '631412345001' })],
      sameLooking, // expenses
      [] // income
    );
    expect(review.map((r) => r.duplicateOf)).toEqual([null, 'r1']);
  });

  it('a flagged duplicate is left unticked but stays in the list — the user can still tick it', () => {
    const [row] = buildReviewTransactions([tx({ referenceNumber: '631412345001' })], [stored({ referenceNumber: '631412345001' })], []);
    expect(row).toMatchObject({ included: false, duplicateConfidence: 'exact' });
  });

  it('a reference match is preferred over a look-alike that appears earlier', () => {
    const existing = [
      stored({ id: 'lookalike', description: 'UPI/SHOP' }),
      stored({ id: 'real', description: 'UPI/SHOP', referenceNumber: '631412345001' }),
    ];
    const review = buildReviewTransactions(
      [tx({ narration: 'UPI/SHOP' }), tx({ narration: 'UPI/SHOP', referenceNumber: '631412345001' })],
      existing, []
    );
    expect(review.map((r) => r.duplicateOf)).toEqual(['lookalike', 'real']);
  });
});

describe('commitInChunks', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => i);

  it.each([[0, []], [1, [1]], [499, [499]], [500, [500]], [501, [500, 1]], [1500, [500, 500, 500]], [1501, [500, 500, 500, 1]]])(
    '%i items -> batches of %j, never more than 500',
    async (count, sizes) => {
      const seen: number[] = [];
      const result = await commitInChunks(items(count), async (chunk) => { seen.push(chunk.length); });
      expect(seen).toEqual(sizes);
      expect(result).toMatchObject({ written: count, failed: 0 });
    }
  );

  it('reports exactly which items were not saved and keeps going after a failed batch', async () => {
    let call = 0;
    const result = await commitInChunks(items(1100), async () => { if (++call === 2 || call === 3) throw new Error('unavailable'); });
    // batch 2 fails twice (first try + one retry), batches 1 and 3 succeed.
    expect(result.written).toBe(600);
    expect(result.failed).toBe(500);
    expect(result.failedIndexes[0]).toBe(500);
    expect(result.failedIndexes[499]).toBe(999);
    expect((result.error as Error).message).toBe('unavailable');
  });

  it('retries a failed batch once with the very same items', async () => {
    const attempts: number[][] = [];
    let first = true;
    const result = await commitInChunks(items(3), async (chunk) => {
      attempts.push(chunk);
      if (first) { first = false; throw new Error('deadline-exceeded'); }
    });
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toBe(attempts[1]);
    expect(result).toMatchObject({ written: 3, failed: 0 });
  });

  it('the throwing variant carries the counts', async () => {
    const error = await commitInChunksOrThrow(items(700), async (chunk) => { if (chunk.length === 200) throw new Error('x'); }).catch((e) => e);
    expect(error).toBeInstanceOf(BulkWriteError);
    expect(error.result).toMatchObject({ written: 500, failed: 200 });
  });
});

describe('planImport / executeImport', () => {
  const row = (over: Partial<ReviewTransaction> = {}): ReviewTransaction => ({
    ...tx(), rowId: 'row', sequence: 0, category: 'Other', description: 'UPI/SHOP', isSalaryCandidate: false,
    uncertain: false, duplicateOf: null, duplicateConfidence: null, included: true, ...over,
  });

  it('accounts for every row: saved + rejected + not selected + unreadable = total', () => {
    const plan = planImport(
      [
        row({ rowId: 'a' }),
        row({ rowId: 'b', type: 'credit', category: 'Salary' }),
        row({ rowId: 'c', included: false }),
        row({ rowId: 'd', type: null, included: false }),
        row({ rowId: 'e', amount: 0 }),
        row({ rowId: 'f', date: null }),
        row({ rowId: 'g', amount: Number.NaN }),
        row({ rowId: 'h', amount: 1e12 }),
        row({ rowId: 'i', type: null }),
      ],
      'import-1'
    );
    expect(plan.expenses).toHaveLength(1);
    expect(plan.incomes).toHaveLength(1);
    expect(plan.rejected.map((r) => [r.rowId, r.reason])).toEqual([
      ['e', 'Amount is zero'], ['f', 'No valid date'], ['g', 'No valid amount'], ['h', 'Amount is too large'], ['i', 'No withdrawal/deposit direction'],
    ]);
    expect(plan.notSelected).toBe(1);
    expect(plan.unreadable).toBe(1);
    expect(plan.expenses.length + plan.incomes.length + plan.rejected.length + plan.notSelected + plan.unreadable).toBe(plan.totalRows);
  });

  it('every planned record passes the security rules as written', () => {
    const plan = planImport(
      [
        row({ narration: 'N'.repeat(3000), description: 'D'.repeat(3000), referenceNumber: 'R'.repeat(300), category: 'C'.repeat(200) }),
        row({ type: 'credit', description: '', narration: 'ONLY NARRATION', referenceNumber: null }),
      ],
      'import-1'
    );
    for (const record of [...plan.expenses, ...plan.incomes]) {
      expect(passesTransactionRules(toTransactionDoc(record, 'uid-1'), 'uid-1')).toBe(true);
    }
    expect(plan.incomes[0].description).toBe('ONLY NARRATION');
    expect('referenceNumber' in plan.incomes[0]).toBe(false);
  });

  it('a writer that throws a plain error counts as nothing saved for that side only', async () => {
    const plan = planImport([row({ rowId: 'a' }), row({ rowId: 'b', type: 'credit' })], 'i');
    const outcome = await executeImport(plan, {
      addExpenses: async () => { throw new Error('permission-denied'); },
      addIncomes: async () => {},
    });
    expect(outcome).toMatchObject({ expensesImported: 0, incomeImported: 1, failed: 1, status: 'partial' });
  });

  it('does not call a writer that has nothing to write', async () => {
    let called = 0;
    const outcome = await executeImport(planImport([row({ included: false })], 'i'), {
      addExpenses: async () => { called++; }, addIncomes: async () => { called++; },
    });
    expect(called).toBe(0);
    expect(outcome).toMatchObject({ imported: 0, failed: 0, notSelected: 1, status: 'completed' });
  });
});

describe('stored documents', () => {
  it('write -> read gives back the same record on the same local day', () => {
    const date = new Date(2026, 10, 30, 0, 0, 7);
    const doc = toTransactionDoc({ amount: 15.5, category: 'Interest', description: 'INT', date, source: 'import', importId: 'i', originalNarration: 'INT', referenceNumber: 'R1' }, 'uid-1');
    expect(doc.userid).toBe('uid-1');
    expect(typeof doc.date).toBe('string');
    const back = fromTransactionDoc('id-1', doc);
    expect(back).toMatchObject({ id: 'id-1', userId: 'uid-1', amount: 15.5, category: 'Interest', referenceNumber: 'R1', source: 'import' });
    expect(back.date.getTime()).toBe(date.getTime());
    expect([back.date.getFullYear(), back.date.getMonth(), back.date.getDate()]).toEqual([2026, 10, 30]);
  });

  it('never writes undefined (Firestore rejects it)', () => {
    const doc = toTransactionDoc({ amount: 1, category: 'Other', description: 'x', date: new Date(2026, 0, 1) }, 'u');
    expect((Object.values(doc) as unknown[]).includes(undefined)).toBe(false);
    expect(Object.keys(doc).sort()).toEqual(['amount', 'category', 'date', 'description', 'userid']);
  });

  it('a record written for one user fails the ownership rule for another', () => {
    const doc = toTransactionDoc({ amount: 1, category: 'Other', description: 'x', date: new Date(2026, 0, 1) }, 'user-a');
    expect(passesTransactionRules(doc, 'user-a')).toBe(true);
    expect(passesTransactionRules(doc, 'user-b')).toBe(false);
  });
});

describe('earnings and cash flow rules', () => {
  const income = (category: Income['category'], amount: number, day = 10, month = 10): Income => ({
    id: `${category}-${amount}-${day}-${month}`, amount, category, description: category, date: new Date(2026, month, day), userId: 'u', source: 'import',
  });

  it('earnings = salary + interest + other income; refunds and transfers are left out', () => {
    const derived = deriveMonthlyEarnings([income('Salary', 50000), income('Other Income', 7500), income('Interest', 15.5), income('Refund', 500), income('Transfer', 5000)])!;
    expect(derived.amount).toBe(57515.5);
  });

  it('a month with only refunds/transfers has no derived earnings (it does not become ₹0 "earned")', () => {
    expect(deriveMonthlyEarnings([income('Refund', 500), income('Transfer', 5000)])).toBeNull();
  });

  it('sums are exact where plain floating-point addition is not', () => {
    const amounts = [0.1, 0.2, 0.3, 19.99, 1005.01, 33.33];
    expect(amounts.reduce((s, a) => s + a, 0)).not.toBe(1058.93); // the bug this guards against
    expect(sumMoney(amounts)).toBe(1058.93);
    expect(deriveMonthlyEarnings(amounts.map((a, i) => income('Other Income', a, i + 1)))!.amount).toBe(1058.93);
    expect(entriesForMonth(amounts.map((a, i) => income('Refund', a, i + 1)), 2026, 10).total).toBe(1058.93);
    expect(toPaise(19.99)).toBe(1999);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('cash-flow credits include salary and refunds, never transfers in; a manual override replaces the figure', () => {
    const entries = [income('Salary', 50000), income('Refund', 500), income('Transfer', 5000)];
    const incomeFor = (y: number, m: number) => entriesForMonth(entries, y, m);
    expect(makeCashFlowLookup(incomeFor, () => null)(2026, 10)!.amount).toBe(50500);
    expect(resolveMonthlyEarnings(2026, 10, entries, null)!.amount).toBe(50000);

    const override: MonthlyEarnings = { year: 2026, month: 10, amount: 60000, status: 'confirmed', source: 'manual', updatedAt: '', override: true };
    expect(makeCashFlowLookup(incomeFor, () => override)(2026, 10)!.amount).toBe(60000);
    expect(resolveMonthlyEarnings(2026, 10, entries, override)!.amount).toBe(60000);
  });

  it('an entry belongs to the month of its local calendar date — the last second of a month included', () => {
    const entries = [
      { ...income('Salary', 1), date: new Date(2026, 10, 30, 23, 59, 59) },
      { ...income('Salary', 2), date: new Date(2026, 11, 1, 0, 0, 0) },
      { ...income('Salary', 4), date: new Date(2026, 11, 31, 23, 59, 59) },
      { ...income('Salary', 8), date: new Date(2027, 0, 1, 0, 0, 0) },
    ];
    expect(entriesForMonth(entries, 2026, 10).total).toBe(1);
    expect(entriesForMonth(entries, 2026, 11).total).toBe(6);
    expect(entriesForMonth(entries, 2027, 0).total).toBe(8);
  });
});
