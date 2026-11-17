import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import { useEarnings } from '../context/EarningsContext';
import { buildStatement } from '../../shared/statementLedger';

export interface LedgerEntry {
  id: string;
  date: Date;
  description: string;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
  runningBalance: number;
}

/**
 * Owns all TransactionLedgerPage business logic (month nav, the month's
 * statement: opening balance, running balance per row, totals, closing) so the Web and Mobile pages share one source
 * of truth and only differ in layout.
 */
export function useTransactionLedgerLogic(initialYear?: number, initialMonth?: number) {
  const { expenses } = useExpenses();
  const { income, getIncomeForMonth } = useIncome();
  const { getEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const now = new Date();
  // Opens on whatever month the Dashboard was showing (initialYear/Month), so
  // landing here right after a bank statement import — which jumps the
  // Dashboard to the statement's month — shows the just-imported transactions
  // instead of silently resetting to today's month.
  const [selectedYear, setSelectedYear] = useState(initialYear ?? now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? now.getMonth());

  const isFutureMonth = isAfter(new Date(selectedYear, selectedMonth, 1), startOfMonth(new Date()));

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const goToMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const statement = useMemo(() => {
    const today = new Date();
    const isFuture = (year: number, month: number) => isAfter(new Date(year, month, 1), startOfMonth(today));

    const expensesByMonth = new Map<string, typeof expenses>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = expensesByMonth.get(key);
      if (bucket) bucket.push(e);
      else expensesByMonth.set(key, [e]);
    }

    /** Every credit and debit for one month, before balances are run. */
    const entriesFor = (year: number, month: number): Omit<LedgerEntry, 'runningBalance'>[] => {
      const entries: Omit<LedgerEntry, 'runningBalance'>[] = [];
      if (!isFuture(year, month)) {
        // Itemized income (e.g. from a statement import) gets one row per
        // credit. Only months with none fall back to the single synthetic
        // "Monthly Salary / Earnings" line from the manual number.
        const { entries: incomeEntries } = getIncomeForMonth(year, month);
        const record = getEarningsForMonth(year, month);
        if (incomeEntries.length > 0) {
          incomeEntries.forEach((i) => entries.push({
            id: i.id, date: i.date, description: i.description, category: i.category, type: 'credit', amount: i.amount,
          }));
          // A manual override replaces the imported total for cash-flow math
          // (see shared/cashFlowLookup.ts), so the difference is shown as its
          // own line to keep this balance in step with the Dashboard.
          if (record?.override) {
            const adjustment = record.amount - incomeEntries.reduce((s, i) => s + i.amount, 0);
            if (adjustment !== 0) {
              entries.push({
                id: `override-${year}-${month}`,
                date: endOfMonth(new Date(year, month)),
                description: 'Earnings override',
                category: 'Income',
                type: adjustment > 0 ? 'credit' : 'debit',
                amount: Math.abs(adjustment),
              });
            }
          }
        } else {
          const amt = record ? record.amount : defaultEarnings;
          if (amt > 0) {
            entries.push({
              id: `e-${year}-${month}`,
              date: new Date(year, month, 1),
              description: 'Monthly Salary / Earnings',
              category: 'Income',
              type: 'credit',
              amount: amt,
            });
          }
        }
      }
      for (const e of expensesByMonth.get(`${year}-${month}`) ?? []) {
        entries.push({ id: e.id, date: new Date(e.date), description: e.description, category: e.category, type: 'debit', amount: e.amount });
      }
      return entries;
    };

    // Like a bank statement, a month opens with whatever the months before
    // it closed with — walked forward from the first month that has data.
    let openingBalance = 0;
    const allDates = [...expenses.map((e) => new Date(e.date)), ...income.map((i) => i.date)];
    if (allDates.length > 0) {
      const earliest = allDates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min));
      let year = earliest.getFullYear();
      let month = earliest.getMonth();
      let guard = 0;
      while (guard++ < 600 && (year < selectedYear || (year === selectedYear && month < selectedMonth))) {
        openingBalance = buildStatement(entriesFor(year, month), openingBalance).closingBalance;
        if (month === 11) { year++; month = 0; } else { month++; }
      }
    }

    return buildStatement(entriesFor(selectedYear, selectedMonth), openingBalance);
  }, [expenses, income, getIncomeForMonth, getEarningsForMonth, defaultEarnings, selectedYear, selectedMonth]);

  return {
    selectedYear,
    selectedMonth,
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    isFutureMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    goToMonth,
    ledger: statement.rows as LedgerEntry[],
    openingBalance: statement.openingBalance,
    totalCredit: statement.totalCredit,
    totalDebit: statement.totalDebit,
    closingBalance: statement.closingBalance,
  };
}
