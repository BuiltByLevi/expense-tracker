import { roundMoney, sumMoney } from './money';
import type { Expense, Income } from './types';

/**
 * What an outgoing entry IS, for the accounting model. Only `spending` is a
 * Monthly Expense. The other kinds still leave the bank account, so they are
 * reported separately — they are never dropped from the statement — but they
 * do not inflate spending:
 *
 *  - cash_withdrawal: an ATM withdrawal turns bank money into cash. The spend
 *    happens when that cash is used, and manually recorded cash spending is
 *    already a Monthly Expense — counting the withdrawal too would count the
 *    same money twice.
 *  - transfer_out: money moved between the user's own accounts. Not a cost.
 *  - investment: savings, not consumption.
 *
 * Genuine expenses stay spending, including EMI & Loans and Bank Charges. A
 * statement EMI cannot be split into principal and interest, so it is kept
 * as spending (a cash-flow outflow), and bank charges are real costs.
 */
export type OutflowKind = 'spending' | 'cash_withdrawal' | 'transfer_out' | 'investment';

const OUTFLOW_KIND: Record<string, OutflowKind> = {
  'Cash Withdrawal': 'cash_withdrawal',
  Transfers: 'transfer_out',
  Investments: 'investment',
};

export function outflowKind(category: string): OutflowKind {
  return OUTFLOW_KIND[category] ?? 'spending';
}

/** Expenses that count toward Monthly Expenses, spending totals and the
 *  spending breakdown. */
export function spendingOnly<T extends Pick<Expense, 'category'>>(expenses: T[]): T[] {
  return expenses.filter((e) => outflowKind(e.category) === 'spending');
}

/** Totals for each outflow kind, so every outgoing rupee is accounted for:
 *  spending + cashWithdrawals + transfersOut + investments = all expenses. */
export function summarizeOutflows(expenses: Pick<Expense, 'category' | 'amount'>[]) {
  const of = (kind: OutflowKind) =>
    sumMoney(expenses.filter((e) => outflowKind(e.category) === kind).map((e) => e.amount));
  return {
    spending: of('spending'),
    cashWithdrawals: of('cash_withdrawal'),
    transfersOut: of('transfer_out'),
    investments: of('investment'),
  };
}

/**
 * Incoming credits that count toward cash flow. Transfers in are money moved
 * from the user's own accounts, so they are excluded just like transfers
 * out — otherwise a self-transfer would raise net cash flow with nothing on
 * the other side. Salary, interest, refunds and other income all count.
 */
export function cashFlowCredits<T extends Pick<Income, 'category'>>(entries: T[]): T[] {
  return entries.filter((e) => e.category !== 'Transfer');
}

/**
 * Income categories that are not Monthly Earnings. A refund returns money the
 * user already spent, so it is reported as Refunds, never as new earnings.
 * An internal transfer in is the user's own money moved, so it is not income.
 */
export const NON_EARNING_INCOME_CATEGORIES = ['Refund', 'Transfer'] as const;

/** Every reported figure for one month, each computed from the same ledger
 *  but kept separate so none can absorb another. */
export interface MonthlyBreakdown {
  /** Confirmed earnings: Salary, Interest, Other Income (per category). */
  monthlyEarnings: number;
  /** Genuine spending: purchases, bills, EMI/loan payments, bank charges. */
  monthlyExpenses: number;
  /** Refunds received this month (cash in, not earnings). */
  refunds: number;
  /** Money from the user's own accounts coming in. Not earnings. */
  transfersIn: number;
  /** Money to the user's own accounts going out. Not expenses. */
  transfersOut: number;
  /** ATM cash withdrawals. Not expenses; cash spent later is already counted. */
  cashWithdrawals: number;
  /** Savings and investments. Not expenses. */
  investments: number;
  /** Earnings + refunds − Monthly Expenses. Excludes internal transfers, cash
   *  withdrawals and investments by design. */
  netCashFlow: number;
  /** Full bank movement: every credit − every debit. Must equal netCashFlow
   *  plus transfers in and minus transfers out, cash withdrawals and investments. */
  bankNetChange: number;
}

type Dated<T> = T & { date: Date };
const inMonth = (date: Date, year: number, month: number) =>
  date.getFullYear() === year && date.getMonth() === month;

/** A reporting period: one calendar month, or a whole calendar year. */
export type AccountingPeriod = { kind: 'month'; year: number; month: number } | { kind: 'year'; year: number };

export function inPeriod(date: Date, period: AccountingPeriod): boolean {
  const d = new Date(date);
  if (period.kind === 'year') return d.getFullYear() === period.year;
  return inMonth(d, period.year, period.month);
}

/**
 * The seven figures for any period, from one ledger. Pure: inputs are not
 * changed, and excluded transactions stay in the ledger — they are only classified here.
 */
export function breakdownForPeriod(
  expenses: Pick<Expense, 'category' | 'amount' | 'date'>[],
  incomes: Pick<Income, 'category' | 'amount' | 'date'>[],
  period: AccountingPeriod
): MonthlyBreakdown {
  const ex = expenses.filter((e) => inPeriod(new Date(e.date), period)) as Dated<Pick<Expense, 'category' | 'amount'>>[];
  const inc = incomes.filter((i) => inPeriod(new Date(i.date), period)) as Dated<Pick<Income, 'category' | 'amount'>>[];
  const sumOf = <T extends { amount: number }>(items: T[]) => sumMoney(items.map((i) => i.amount));

  const monthlyEarnings = sumOf(inc.filter((i) => !(NON_EARNING_INCOME_CATEGORIES as readonly string[]).includes(i.category)));
  const refunds = sumOf(inc.filter((i) => i.category === 'Refund'));
  const transfersIn = sumOf(inc.filter((i) => i.category === 'Transfer'));
  const outflows = summarizeOutflows(ex);
  const monthlyExpenses = outflows.spending;
  const netCashFlow = roundMoney(monthlyEarnings + refunds - monthlyExpenses);
  const bankNetChange = roundMoney(
    monthlyEarnings + refunds + transfersIn - monthlyExpenses - outflows.cashWithdrawals - outflows.transfersOut - outflows.investments
  );

  return {
    monthlyEarnings,
    monthlyExpenses,
    refunds,
    transfersIn,
    transfersOut: outflows.transfersOut,
    cashWithdrawals: outflows.cashWithdrawals,
    investments: outflows.investments,
    netCashFlow,
    bankNetChange,
  };
}

/** The seven figures for one calendar month. */
export function monthlyBreakdown(
  expenses: Pick<Expense, 'category' | 'amount' | 'date'>[],
  incomes: Pick<Income, 'category' | 'amount' | 'date'>[],
  year: number,
  month: number
): MonthlyBreakdown {
  return breakdownForPeriod(expenses, incomes, { kind: 'month', year, month });
}
