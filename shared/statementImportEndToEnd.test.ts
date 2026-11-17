import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCsvText, type ParseResult } from './statementParsers/csvParser';
import { parseExcelBuffer } from './statementParsers/excelParser';
import { itemsToTransactions } from './statementParsers/pdfStatement';
import { assignCategory, assignRowType, buildReviewTransactions, needsCategory, needsConfirmation, needsDirection } from './statementReview';
import { executeImport, planImport, statementTotals } from './statementImport';
import { summarizeStatement, buildStatement } from './statementLedger';
import { resolveMonthlyEarnings } from './earningsResolution';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { makeCashFlowLookup } from './cashFlowLookup';
import { computeFinanceTotals } from './finance';
import { entriesForMonth } from './monthFilter';
import type { NormalizedTransaction } from './statementParsers/types';
import {
  EXPECTED, FIXTURE, FakeStore, OPENING_BALANCE, excelBuffer, pdfColumnItems, pdfMarkerItems,
  separateColumnsCsv, signedAmountCsv, singleAmountCsv, type FixtureRow,
} from './testFixtures/statementFixture';

const NOV = { year: 2026, month: 10 };

function parsed(result: ParseResult): NormalizedTransaction[] {
  if ('error' in result) throw new Error(result.error.message);
  return result.transactions;
}

/** parse result -> review -> plan -> save, as the import hooks do it. */
async function runImport(transactions: NormalizedTransaction[], store: FakeStore, confirm?: (narration: string) => string) {
  let review = buildReviewTransactions(transactions, store.expenses, store.income);
  // The user classifies deposits the narration does not place. Without a
  // `confirm`, they stay unassigned and are not imported.
  if (confirm) {
    for (const row of review) {
      if (needsCategory(row)) review = assignCategory(review, row.rowId, confirm(row.narration));
    }
  }
  // Own-account deposits carry a suggestion the user must confirm. These
  // helper-driven tests exercise import mechanics, so they accept the
  // suggestion as a user would. The gate itself is tested explicitly below
  // ("an unconfirmed own-account deposit is never imported").
  for (const row of review) {
    if (needsConfirmation(row)) review = assignCategory(review, row.rowId, row.category);
  }
  const plan = planImport(review, 'import-test');
  const outcome = await executeImport(plan, store);
  return { review, plan, outcome };
}

/** The figures every screen shows for one month, computed by the same shared
 *  functions the Dashboard, Earnings History and Transaction Ledger call. */
function monthFigures(store: FakeStore, year = NOV.year, month = NOV.month) {
  const incomeFor = (y: number, m: number) => entriesForMonth(store.income, y, m);
  const earnings = resolveMonthlyEarnings(year, month, incomeFor(year, month).entries, null);
  const totals = computeFinanceTotals(store.expenses, store.income, 0, makeCashFlowLookup(incomeFor, () => null), year, month);
  const summary = totals.monthlySummaries.find((s) => s.year === year && s.month === month);
  const ledger = buildStatement(
    [
      ...incomeFor(year, month).entries.map((i) => ({ date: i.date, type: 'credit' as const, amount: i.amount })),
      ...entriesForMonth(store.expenses, year, month).entries.map((e) => ({ date: e.date, type: 'debit' as const, amount: e.amount })),
    ],
    0
  );
  return {
    monthlyEarnings: earnings?.amount ?? 0,
    monthlyExpenses: summary?.spent ?? 0,
    netCashFlow: summary?.monthBalance ?? 0,
    cumulativeNetCashFlow: totals.cumulativeNetCashFlow - totals.cashFlowDeficit,
    ledgerCredits: ledger.totalCredit,
    ledgerDebits: ledger.totalDebit,
    ledgerClosing: ledger.closingBalance,
  };
}

beforeEach(() => {
  // computeFinanceTotals never looks past "today"; pin it after the fixture month.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2027, 0, 15, 12));
});
afterEach(() => vi.useRealTimers());

const FORMATS: { name: string; parse: () => NormalizedTransaction[]; hasBalances: boolean }[] = [
  { name: 'CSV — separate Withdrawal/Deposit columns', parse: () => parsed(parseCsvText(separateColumnsCsv())), hasBalances: true },
  { name: 'CSV — single Amount column with DR/CR marker', parse: () => parsed(parseCsvText(singleAmountCsv())), hasBalances: true },
  { name: 'CSV — single signed Amount column with timestamps', parse: () => parsed(parseCsvText(signedAmountCsv())), hasBalances: true },
  { name: 'Excel .xlsx — real date and number cells', parse: () => parsed(parseExcelBuffer(excelBuffer('xlsx'))), hasBalances: true },
  { name: 'Excel .xls — real date and number cells', parse: () => parsed(parseExcelBuffer(excelBuffer('biff8'))), hasBalances: true },
  { name: 'PDF text — Withdrawal/Deposit/Balance columns', parse: () => itemsToTransactions(pdfColumnItems()), hasBalances: true },
  { name: 'PDF text — single Amount with Dr/Cr markers', parse: () => itemsToTransactions(pdfMarkerItems()), hasBalances: true },
];

describe.each(FORMATS)('16-transaction statement · $name', ({ parse }) => {
  it('extracts all 16 rows with the right date, direction and exact amount', () => {
    const txs = parse();
    expect(txs).toHaveLength(EXPECTED.rows);
    expect(txs.map((t) => [t.date?.getFullYear(), t.date?.getMonth(), t.date?.getDate(), t.type, t.amount])).toEqual(
      FIXTURE.map((r) => [2026, 10, r.day, r.type, r.amount])
    );
    expect(txs.filter((t) => t.parseIssue)).toEqual([]);
  });

  it('totals 8 credits = ₹63,015.50 and 8 debits = ₹11,149.00, and the statement reconciles', () => {
    const summary = summarizeStatement(parse());
    expect(summary).toMatchObject({
      creditCount: EXPECTED.creditCount,
      totalCredits: EXPECTED.creditTotal,
      debitCount: EXPECTED.debitCount,
      totalDebits: EXPECTED.debitTotal,
      unreadCount: 0,
      openingBalance: OPENING_BALANCE,
      closingBalance: EXPECTED.closingBalance,
      reconciled: true,
    });
  });

  it('files every row under the expected category, nothing flagged as a duplicate; only the own-account deposit waits for confirmation', () => {
    const review = buildReviewTransactions(parse(), [], []);
    expect(review.map((r) => r.category)).toEqual(FIXTURE.map((r) => r.category));
    // The own-account deposit is kept visible but not pre-selected until confirmed.
    const pending = review.filter((r) => !r.included);
    // Matched on the own-account wording: the exact text varies by file format (wrapping, a trailing Cr).
    expect(pending).toHaveLength(1);
    expect(pending[0].narration).toMatch(/SELF\s*TRANSFER/);
    expect(pending.every((r) => needsConfirmation(r))).toBe(true);
    expect(review.filter((r) => r.included)).toHaveLength(FIXTURE.length - 1);
    expect(review.filter((r) => r.duplicateOf)).toEqual([]);
  });

  it('saves all 16, reads them back, and every screen figure matches the hand calculation', async () => {
    const store = new FakeStore();
    const { outcome, plan } = await runImport(parse(), store);

    expect(plan.rejected).toEqual([]);
    expect(outcome).toMatchObject({ imported: 16, expensesImported: 8, incomeImported: 8, failed: 0, rejected: 0, skipped: 0, status: 'completed' });
    expect(store.income).toHaveLength(8);
    expect(store.expenses).toHaveLength(8);

    expect(monthFigures(store)).toEqual({
      monthlyEarnings: EXPECTED.monthlyEarnings,
      monthlyExpenses: EXPECTED.monthlyExpenses,
      netCashFlow: EXPECTED.netCashFlow,
      cumulativeNetCashFlow: EXPECTED.netCashFlow,
      ledgerCredits: EXPECTED.creditTotal,
      ledgerDebits: EXPECTED.debitTotal,
      ledgerClosing: EXPECTED.bankNetChange,
    });
  });

  it('re-importing the same statement adds nothing', async () => {
    const store = new FakeStore();
    await runImport(parse(), store);
    const again = await runImport(parse(), store);

    expect(again.review.filter((r) => r.duplicateOf)).toHaveLength(16);
    expect(again.review.filter((r) => r.included)).toHaveLength(0);
    expect(again.outcome).toMatchObject({ imported: 0, failed: 0, notSelected: 16 });
    expect(store.income).toHaveLength(8);
    expect(store.expenses).toHaveLength(8);
    expect(monthFigures(store).monthlyEarnings).toBe(EXPECTED.monthlyEarnings);
  });
});

describe('the same statement arriving in a different format is still recognised', () => {
  it.each([
    ['CSV then Excel', () => parsed(parseCsvText(separateColumnsCsv())), () => parsed(parseExcelBuffer(excelBuffer('xlsx')))],
    ['Excel then PDF', () => parsed(parseExcelBuffer(excelBuffer('xlsx'))), () => itemsToTransactions(pdfColumnItems())],
    ['PDF then single-amount CSV', () => itemsToTransactions(pdfMarkerItems()), () => parsed(parseCsvText(singleAmountCsv()))],
  ])('%s: no second copy of any transaction', async (_name, first, second) => {
    const store = new FakeStore();
    await runImport(first(), store);
    const again = await runImport(second(), store);
    expect(again.outcome.imported).toBe(0);
    expect(store.docs.size).toBe(16);
  });
});

describe('earned income vs. other credits', () => {
  it('Monthly Earnings counts salary, Razorpay, Payload and interest — never the refund or the transfer', async () => {
    const store = new FakeStore();
    await runImport(parsed(parseCsvText(separateColumnsCsv())), store);
    const derived = deriveMonthlyEarnings(entriesForMonth(store.income, NOV.year, NOV.month).entries)!;
    const by = (pattern: RegExp) => derived.countedEntries.filter((e) => pattern.test(e.description)).reduce((s, e) => s + e.amount, 0);

    expect(by(/SALARY/)).toBe(50000);
    expect(by(/RAZORPAY/)).toBe(3750);
    expect(by(/PAYLOAD/)).toBe(3750);
    expect(by(/INT\.PD/)).toBe(15.5);
    expect(derived.amount).toBe(57515.5);
    expect(derived.otherEntries.map((e) => [e.category, e.amount]).sort()).toEqual([['Refund', 500], ['Transfer', 5000]]);
  });

  it('the refund counts as cash in, the transfer does not: net cash flow = earnings + refund − spending', async () => {
    const store = new FakeStore();
    await runImport(parsed(parseCsvText(separateColumnsCsv())), store);
    const figures = monthFigures(store);
    expect(figures.netCashFlow).toBe(EXPECTED.netCashFlow);
    expect(figures.netCashFlow).toBe(57515.5 + 500 - 9149);
    // The bank statement still shows every rupee: transfer and ATM included.
    expect(figures.ledgerCredits - figures.monthlyEarnings).toBe(5500);
    expect(figures.ledgerClosing).toBe(EXPECTED.bankNetChange);
  });
});

describe('month boundaries survive the save/read round trip', () => {
  const edge: FixtureRow[] = [
    { day: 0, narration: 'UPI/700000000001/LAST DAY OF OCTOBER', reference: '', type: 'debit', amount: 100, category: 'Other' },
    { day: 1, narration: 'UPI/700000000002/FIRST DAY OF NOVEMBER', reference: '', type: 'debit', amount: 200, category: 'Other' },
    { day: 30, narration: 'UPI/700000000003/LAST DAY OF NOVEMBER', reference: '', type: 'credit', amount: 300.1, category: 'Other Income' },
    { day: 31, narration: 'UPI/700000000004/FIRST DAY OF DECEMBER', reference: '', type: 'credit', amount: 400.2, category: 'Other Income' },
    { day: 61, narration: 'UPI/700000000005/LAST DAY OF THE YEAR', reference: '', type: 'debit', amount: 500, category: 'Other' },
    { day: 62, narration: 'UPI/700000000006/FIRST DAY OF NEXT YEAR', reference: '', type: 'debit', amount: 600, category: 'Other' },
  ];
  const stamp = (r: FixtureRow, time: string) => {
    const d = new Date(2026, 10, r.day);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${time}`;
  };
  const file = (time: string) =>
    ['Date,Narration,Debit,Credit', ...edge.map((r) => `${stamp(r, time)},${r.narration},${r.type === 'debit' ? r.amount : ''},${r.type === 'credit' ? r.amount : ''}`)].join('\n');

  it.each(['00:00:01', '23:59:59', '11:59:59 PM'])('rows stamped %s stay in the month the bank printed', async (time) => {
    const store = new FakeStore();
    const { outcome } = await runImport(parsed(parseCsvText(file(time))), store, () => 'Other Income');
    expect(outcome.imported).toBe(6);

    const month = (y: number, m: number) => [
      ...entriesForMonth(store.expenses, y, m).entries,
      ...entriesForMonth(store.income, y, m).entries,
    ].map((e) => e.description.split('/')[2]).sort();
    expect(month(2026, 9)).toEqual(['LAST DAY OF OCTOBER']);
    expect(month(2026, 10)).toEqual(['FIRST DAY OF NOVEMBER', 'LAST DAY OF NOVEMBER']);
    expect(month(2026, 11)).toEqual(['FIRST DAY OF DECEMBER', 'LAST DAY OF THE YEAR']);
    expect(month(2027, 0)).toEqual(['FIRST DAY OF NEXT YEAR']);

    // Cumulative net cash flow walks Oct -> Jan from the same records.
    const incomeFor = (y: number, m: number) => entriesForMonth(store.income, y, m);
    const totals = computeFinanceTotals(store.expenses, store.income, 0, makeCashFlowLookup(incomeFor, () => null), 2027, 0);
    expect(totals.monthlySummaries.map((s) => [s.year, s.month, s.earnings, s.spent, s.runningBalance])).toEqual([
      [2026, 9, 0, 100, -100],
      [2026, 10, 300.1, 200, 0.1],
      [2026, 11, 400.2, 500, -99.7],
      [2027, 0, 0, 600, -699.7],
    ]);
  });

  it('many rows on one day keep their order and never spill into the next day', async () => {
    const sameDay = Array.from({ length: 40 }, (_, i) => `30/11/2026,UPI/8000000000${String(i).padStart(2, '0')}/SHOP ${i},${i + 1}.10,`);
    const store = new FakeStore();
    await runImport(parsed(parseCsvText(['Date,Narration,Debit,Credit', ...sameDay].join('\n'))), store);
    const saved = store.expenses.sort((a, b) => a.date.getTime() - b.date.getTime());
    expect(saved).toHaveLength(40);
    expect(saved.every((e) => e.date.getMonth() === 10 && e.date.getDate() === 30)).toBe(true);
    expect(saved.map((e) => e.amount)).toEqual(Array.from({ length: 40 }, (_, i) => Number((i + 1.1).toFixed(2))));
    expect(monthFigures(store).monthlyExpenses).toBe(824); // (1+…+40) + 40 × 0.10, exact
  });
});

describe('overlapping statements', () => {
  it('a statement that overlaps an earlier one only adds the rows that are new', async () => {
    const store = new FakeStore();
    const firstHalf = FIXTURE.slice(0, 10);
    await runImport(parsed(parseCsvText(separateColumnsCsv(firstHalf))), store);
    expect(store.docs.size).toBe(10);

    // Second statement covers rows 6-16: five rows overlap the first import.
    const overlap = FIXTURE.slice(5);
    const openingForOverlap = OPENING_BALANCE + FIXTURE.slice(0, 5).reduce((s, r) => s + (r.type === 'credit' ? r.amount : -r.amount), 0);
    const second = await runImport(parsed(parseCsvText(separateColumnsCsv(overlap, openingForOverlap))), store);

    expect(second.review.filter((r) => r.duplicateOf)).toHaveLength(5);
    expect(second.outcome.imported).toBe(6);
    expect(store.docs.size).toBe(16);
    expect(monthFigures(store)).toMatchObject({
      monthlyEarnings: EXPECTED.monthlyEarnings,
      monthlyExpenses: EXPECTED.monthlyExpenses,
      netCashFlow: EXPECTED.netCashFlow,
    });
  });

  it('two genuine same-day, same-amount payments are both imported, and both recognised on re-import', async () => {
    const rows = [
      'Date,Narration,Ref No,Debit,Credit',
      '10/11/2026,UPI/BUS FARE,,20.00,',
      '10/11/2026,UPI/BUS FARE,,20.00,',
      '10/11/2026,UPI/900000000001/CAFE,900000000001,150.00,',
      '10/11/2026,UPI/900000000002/CAFE,900000000002,150.00,',
      '11/11/2026,PAYOUT BATCH,,,999.00',
      '11/11/2026,PAYOUT BATCH,,,999.00',
    ].join('\n');
    const store = new FakeStore();
    const first = await runImport(parsed(parseCsvText(rows)), store);
    expect(first.review.filter((r) => r.duplicateOf)).toEqual([]);
    expect(first.outcome.imported).toBe(6);

    const again = await runImport(parsed(parseCsvText(rows)), store);
    expect(again.review.filter((r) => r.duplicateOf)).toHaveLength(6);
    expect(new Set(again.review.map((r) => r.duplicateOf)).size).toBe(6); // each matched to its own stored record
    expect(again.outcome.imported).toBe(0);
    expect(store.docs.size).toBe(6);
  });

  it('one stored payment does not hide a second identical one that is new', async () => {
    const store = new FakeStore();
    await runImport(parsed(parseCsvText('Date,Narration,Debit,Credit\n10/11/2026,UPI/BUS FARE,20.00,')), store);
    const next = await runImport(parsed(parseCsvText('Date,Narration,Debit,Credit\n10/11/2026,UPI/BUS FARE,20.00,\n10/11/2026,UPI/BUS FARE,20.00,')), store);
    expect(next.review.map((r) => !!r.duplicateOf)).toEqual([true, false]);
    expect(next.outcome.imported).toBe(1);
    expect(store.expenses).toHaveLength(2);
  });
});

describe('rows the file cannot fully describe are kept for the user, never dropped', () => {
  const file = [
    'Date,Narration,Amount',
    '05/11/2026,MYSTERY ONE,1200.00',
    '06/11/2026,,75.50',
    'not-a-date,BROKEN DATE,10.00',
    '07/11/2026,NO AMOUNT,',
  ].join('\n');

  it('an unsigned single Amount column with no marker and no balance leaves direction to the user', () => {
    const review = buildReviewTransactions(parsed(parseCsvText(file)), [], []);
    expect(review).toHaveLength(4);
    expect(review.filter(needsDirection).map((r) => [r.narration, r.amount])).toEqual([['MYSTERY ONE', 1200], ['(no description)', 75.5]]);
    expect(review.every((r) => !r.included)).toBe(true);
    expect(review.every((r) => r.uncertain)).toBe(true);
  });

  it('once the user says which way it went and what it is, the row imports like any other', async () => {
    const store = new FakeStore();
    let review = buildReviewTransactions(parsed(parseCsvText(file)), [], []);
    review = assignRowType(review, review[0].rowId, 'credit', store.expenses, store.income);
    review = assignCategory(review, review[0].rowId, 'Other Income');
    review = assignRowType(review, review[1].rowId, 'debit', store.expenses, store.income);
    const plan = planImport(review, 'import-x');
    const outcome = await executeImport(plan, store);

    expect(outcome).toMatchObject({ imported: 2, incomeImported: 1, expensesImported: 1, unreadable: 2, failed: 0 });
    expect(plan.expenses.length + plan.incomes.length + plan.rejected.length + plan.notSelected + plan.unreadable).toBe(plan.totalRows);
    expect(store.income[0]).toMatchObject({ amount: 1200, category: 'Other Income' });
    expect(store.expenses[0]).toMatchObject({ amount: 75.5, description: '(no description)' });
  });
});

describe('what gets written matches what is reported', () => {
  const many = (count: number) =>
    ['Date,Narration,Debit,Credit', ...Array.from({ length: count }, (_, i) => `1${i % 9}/11/2026,UPI/SHOP NUMBER ${i},${i + 1}.00,`)].join('\n');

  it('more than 500 rows are split into batches and all saved', async () => {
    const store = new FakeStore();
    const { outcome } = await runImport(parsed(parseCsvText(many(1203))), store);
    expect(outcome).toMatchObject({ imported: 1203, failed: 0, status: 'completed' });
    expect(store.expenses).toHaveLength(1203);
    expect(store.batchesAttempted).toBe(3);
  });

  it('a batch that fails is reported as exactly that many unsaved — the rest are saved, and status is partial', async () => {
    const store = new FakeStore();
    store.failBatches.add(2);
    const { outcome } = await runImport(parsed(parseCsvText(many(1203))), store);
    expect(outcome).toMatchObject({ imported: 703, failed: 500, status: 'partial' });
    expect(store.expenses).toHaveLength(703);

    // Importing the same file again saves exactly the missing 500 — no copies.
    store.failBatches.clear();
    const retry = await runImport(parsed(parseCsvText(many(1203))), store);
    expect(retry.outcome).toMatchObject({ imported: 500, failed: 0 });
    expect(store.expenses).toHaveLength(1203);
  });

  it('a transient failure is retried and nothing is written twice', async () => {
    const store = new FakeStore();
    store.failOnce.add(1);
    const { outcome } = await runImport(parsed(parseCsvText(many(20))), store);
    expect(outcome).toMatchObject({ imported: 20, failed: 0, status: 'completed' });
    expect(store.expenses).toHaveLength(20);
    expect(store.batchesAttempted).toBe(2);
  });

  it('income failing does not hide that expenses were saved (and vice versa)', async () => {
    const store = new FakeStore();
    store.failBatches.add(2); // expenses are batch 1, income is batch 2
    const { outcome } = await runImport(parsed(parseCsvText(separateColumnsCsv())), store);
    expect(outcome).toMatchObject({ expensesImported: 8, incomeImported: 0, imported: 8, failed: 8, status: 'partial' });
    expect(store.expenses).toHaveLength(8);
    expect(store.income).toHaveLength(0);
  });

  it('nothing saved at all is reported as failed, not as a success', async () => {
    const store = new FakeStore();
    store.failBatches.add(1).add(2);
    const { outcome } = await runImport(parsed(parseCsvText(separateColumnsCsv())), store);
    expect(outcome).toMatchObject({ imported: 0, failed: 16, status: 'failed' });
    expect(store.docs.size).toBe(0);
  });

  it('an over-long narration is trimmed to what the security rules accept instead of sinking its whole batch', async () => {
    const long = 'UPI/' + 'VERY LONG MERCHANT NAME '.repeat(60);
    const store = new FakeStore();
    const { outcome } = await runImport(parsed(parseCsvText(`Date,Narration,Debit,Credit\n10/11/2026,${long},50.00,\n11/11/2026,UPI/NORMAL,60.00,`)), store);
    expect(outcome).toMatchObject({ imported: 2, failed: 0 });
    const saved = store.expenses.find((e) => e.amount === 50)!;
    expect(saved.description.length).toBe(500);
    expect(saved.originalNarration!.length).toBe(1000);
  });

  it('records belong to the signed-in user and are invisible to anyone else', async () => {
    const store = new FakeStore('user-a');
    await runImport(parsed(parseCsvText(separateColumnsCsv())), store);
    expect([...store.docs.values()].every((d) => d.data.userid === 'user-a')).toBe(true);
    store.uid = 'user-b';
    expect(store.expenses).toEqual([]);
    expect(store.income).toEqual([]);
  });

  it('the import log totals are exact', () => {
    const review = buildReviewTransactions(parsed(parseCsvText(separateColumnsCsv())), [], []);
    expect(statementTotals(review)).toEqual({ creditsTotal: 63015.5, debitsTotal: 11149 });
  });
});

describe('own-account deposits need the user to confirm them', () => {
  it('an unconfirmed own-account deposit is never imported and never counted as income', async () => {
    const store = new FakeStore();
    const review = buildReviewTransactions(
      parsed(parseCsvText('Date,Narration,Debit,Credit\n10/11/2026,IMPS/1/SELF TRANSFER FROM SAVINGS,,5000.00\n11/11/2026,UPI/BUS FARE,20.00,')),
      store.expenses,
      store.income
    );
    const transfer = review.find((r) => r.narration.includes('SELF TRANSFER'))!;
    expect(transfer.category).toBe('Transfer');
    expect(transfer.uncertain).toBe(true);
    expect(transfer.included).toBe(false);
    expect(needsConfirmation(transfer)).toBe(true);

    const plan = planImport(review, 'import-test');
    expect(plan.incomes.some((i) => i.amount === 5000)).toBe(false);
    expect(plan.incomes.length).toBe(0);
    expect(plan.notSelected).toBe(1); // the transfer is left for review, not dropped
    expect(plan.rejected.length).toBe(0);
  });

  it('confirming the suggestion selects it; changing the category also counts as confirmation', () => {
    const rows = buildReviewTransactions(
      parsed(parseCsvText('Date,Narration,Debit,Credit\n10/11/2026,IMPS/1/SELF TRANSFER FROM SAVINGS,,5000.00')),
      [],
      []
    );
    const rowId = rows[0].rowId;
    const confirmed = assignCategory(rows, rowId, 'Transfer');
    expect(confirmed[0].included).toBe(true);
    expect(needsConfirmation(confirmed[0])).toBe(false);

    const changed = assignCategory(rows, rowId, 'Other Income');
    expect(changed[0].category).toBe('Other Income');
    expect(changed[0].included).toBe(true);
  });

  it('planImport refuses an own-account deposit that reaches it unconfirmed', () => {
    const rows = buildReviewTransactions(
      parsed(parseCsvText('Date,Narration,Debit,Credit\n10/11/2026,IMPS/1/SELF TRANSFER FROM SAVINGS,,5000.00')),
      [],
      []
    );
    const forced = rows.map((r) => ({ ...r, included: true }));
    const plan = planImport(forced, 'import-test');
    expect(plan.incomes.length).toBe(0);
    expect(plan.rejected[0].reason).toBe('Confirm the suggested category for this deposit');
  });
});
