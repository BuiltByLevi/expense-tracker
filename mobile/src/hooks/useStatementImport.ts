import { useMemo, useState } from 'react';
import { useExpenses } from '@/context/useExpenses';
import { useIncome } from '@/context/useIncome';
import { parseStatement, pickStatementFile } from '@/services/statementFile';
import { assignCategory, assignRowType, buildReviewTransactions, isImportable, needsCategory, needsConfirmation } from '@shared/statementReview';
import { executeImport, planImport } from '@shared/statementImport';
import { sumMoney } from '@shared/money';
import type { ReviewTransaction, TransactionType } from '@shared/statementParsers/types';
import type { Expense, Income } from '@shared/types';

export type ImportStatus = 'idle' | 'parsing' | 'review' | 'importing' | 'done' | 'error';

export interface ImportSummary {
  expensesImported: number;
  incomeImported: number;
  skipped: number;
  /** Rows that were sent to the database and did not save. */
  failed: number;
}

/**
 * Mobile statement import. Mirrors the web hook's flow — pick → parse →
 * classify/dedupe → review → confirm → write — and reuses the same shared
 * parsing (shared/statementParsers) and review (shared/statementReview)
 * modules, so classification and duplicate rules cannot drift between apps.
 */
export function useStatementImport() {
  const { expenses, addExpenses } = useExpenses();
  const { income, addIncomes } = useIncome();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ReviewTransaction[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const statementPeriod = useMemo(() => {
    const dates = rows.map((r) => r.date).filter((d): d is Date => d !== null);
    if (dates.length === 0) return { start: null, end: null };
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [rows]);

  const pickAndParse = async () => {
    setErrorMessage(null);
    let picked;
    try {
      picked = await pickStatementFile();
    } catch {
      setStatus('error');
      setErrorMessage('Could not open the file picker.');
      return;
    }
    if (!picked) return; // user cancelled — stay on the idle screen

    setFileName(picked.name);
    setStatus('parsing');

    const result = await parseStatement(picked);
    if ('error' in result) {
      setStatus('error');
      setErrorMessage(result.error.message);
      return;
    }
    if (result.transactions.length === 0) {
      setStatus('error');
      setErrorMessage('No transactions were found in that file.');
      return;
    }

    setRows(buildReviewTransactions(result.transactions, expenses, income));
    setStatus('review');
  };

  // A row that cannot be saved (no direction, date or amount), or a deposit
  // still waiting for a category, cannot be ticked — ticking it would promise
  // an import that then skips it.
  const selectable = (r: ReviewTransaction) => isImportable(r) && !needsCategory(r) && !needsConfirmation(r);

  const toggleInclude = (rowId: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, included: !r.included && selectable(r) } : r)));
  };

  const setAllIncluded = (included: boolean) => {
    // Bulk-select must not mark unsaveable rows included, for the same reason.
    setRows((prev) => prev.map((r) => ({ ...r, included: included && selectable(r) })));
  };

  /** The user's answer for a row whose direction the file didn't give. */
  const setRowType = (rowId: string, type: TransactionType) => {
    setRows((prev) => assignRowType(prev, rowId, type, expenses, income));
  };

  /** The user's category for a row (deposits wait for one before they import). */
  const updateCategory = (rowId: string, category: string) => {
    setRows((prev) => assignCategory(prev, rowId, category));
  };

  /** Confirms the suggested category of a row (e.g. an own-account transfer). */
  const confirmRow = (rowId: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.rowId === rowId);
      return row?.category ? assignCategory(prev, rowId, row.category) : prev;
    });
  };

  const stats = useMemo(() => {
    const included = rows.filter((r) => r.included);
    return {
      total: rows.length,
      included: included.length,
      credits: included.filter((r) => r.type === 'credit').length,
      debits: included.filter((r) => r.type === 'debit').length,
      duplicates: rows.filter((r) => r.duplicateOf).length,
      uncertain: rows.filter((r) => r.uncertain).length,
      unassigned: rows.filter(needsCategory).length,
      undecided: rows.filter((r) => r.type === null && r.date !== null && r.amount !== null).length,
      creditTotal: sumMoney(included.filter((r) => r.type === 'credit').map((r) => r.amount ?? 0)),
      debitTotal: sumMoney(included.filter((r) => r.type === 'debit').map((r) => r.amount ?? 0)),
    };
  }, [rows]);

  /**
   * Writes included rows — debits as expenses, credits as income — so every
   * credit flows into Monthly Earnings / cash-flow, not just a detected
   * salary line. Rows missing date/amount/type are never written.
   */
  const confirmImport = async () => {
    setStatus('importing');
    const plan = planImport(rows, `import-${Date.now()}`);
    const outcome = await executeImport(plan, {
      addExpenses: (records) => addExpenses(records as Omit<Expense, 'id' | 'userId'>[]),
      addIncomes: (records) => addIncomes(records as Omit<Income, 'id' | 'userId'>[]),
    });

    if (outcome.failed > 0) {
      // Exact counts: what was saved stays saved, and re-importing the same
      // file flags those rows as duplicates rather than adding them twice.
      setStatus('error');
      setErrorMessage(
        `${outcome.imported} of ${outcome.imported + outcome.failed} transactions were saved; ${outcome.failed} could not be saved. ` +
          'Check your connection and import the file again — rows already saved will be flagged as duplicates.'
      );
      return;
    }

    setSummary({
      expensesImported: outcome.expensesImported,
      incomeImported: outcome.incomeImported,
      skipped: outcome.rejected,
      failed: outcome.failed,
    });
    setStatus('done');
  };

  const reset = () => {
    setStatus('idle');
    setRows([]);
    setErrorMessage(null);
    setFileName('');
    setSummary(null);
  };

  return {
    status,
    errorMessage,
    fileName,
    rows,
    stats,
    summary,
    statementPeriod,
    pickAndParse,
    toggleInclude,
    setAllIncluded,
    setRowType,
    updateCategory,
    confirmRow,
    confirmImport,
    reset,
  };
}
