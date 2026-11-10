import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, isAfter } from 'date-fns';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import { useEarnings } from '../context/EarningsContext';

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
 * Owns all TransactionLedgerPage business logic (month nav, the ledger merge +
 * running-balance memo, totals) so the Web and Mobile pages share one source
 * of truth and only differ in layout.
 */
export function useTransactionLedgerLogic() {
  const { expenses } = useExpenses();
  const { getIncomeForMonth } = useIncome();
  const { getEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

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

  const ledger = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [];
    if (!isFutureMonth) {
      // Real itemized income for this month (e.g. from a bank statement
      // import) takes priority — one ledger row per credit, same as debits
      // get one row per expense. Only months with none fall back to the
      // single synthetic "Monthly Salary / Earnings" line from the manual number.
      const { entries: incomeEntries } = getIncomeForMonth(selectedYear, selectedMonth);
      if (incomeEntries.length > 0) {
        incomeEntries.forEach((i) => entries.push({
          id: i.id,
          date: i.date,
          description: i.description,
          category: i.category,
          type: 'credit',
          amount: i.amount,
          runningBalance: 0,
        }));
      } else {
        const record = getEarningsForMonth(selectedYear, selectedMonth);
        const amt = record ? record.amount : defaultEarnings;
        if (amt > 0) {
          entries.push({
            id: `e-${selectedYear}-${selectedMonth}`,
            date: new Date(selectedYear, selectedMonth, 1),
            description: 'Monthly Salary / Earnings',
            category: 'Income',
            type: 'credit',
            amount: amt,
            runningBalance: 0,
          });
        }
      }
    }
    const monthExp = expenses.filter((e) =>
      isWithinInterval(new Date(e.date), {
        start: startOfMonth(new Date(selectedYear, selectedMonth)),
        end: endOfMonth(new Date(selectedYear, selectedMonth)),
      })
    );
    monthExp.forEach((e) => entries.push({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      category: e.category,
      type: 'debit',
      amount: e.amount,
      runningBalance: 0,
    }));
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    let bal = 0;
    entries.forEach((e) => {
      bal += e.type === 'credit' ? e.amount : -e.amount;
      e.runningBalance = bal;
    });
    return entries;
  }, [expenses, getIncomeForMonth, getEarningsForMonth, defaultEarnings, selectedYear, selectedMonth, isFutureMonth]);

  const totalCredit = useMemo(() => ledger.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0), [ledger]);
  const totalDebit = useMemo(() => ledger.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0), [ledger]);
  const closingBalance = totalCredit - totalDebit;

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
    ledger,
    totalCredit,
    totalDebit,
    closingBalance,
  };
}
