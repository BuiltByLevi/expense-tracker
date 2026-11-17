import { useMemo, useState } from 'react';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import { useStatementImports } from './useStatementImports';
import { parseCsvFile } from '../utils/statementParsers/csvParser';
import { parseExcelFile } from '../utils/statementParsers/excelParser';
import { parsePdfFile } from '../utils/statementParsers/pdfParser';
import { assignCategory, assignRowType, buildReviewTransactions, isImportable, needsCategory, needsConfirmation } from '../../shared/statementReview';
import { summarizeStatement } from '../../shared/statementLedger';
import { executeImport, planImport, statementTotals, type ImportOutcome } from '../../shared/statementImport';
import { sumMoney } from '../../shared/money';
import type { NormalizedTransaction, ReviewTransaction, TransactionType } from '../utils/statementParsers/types';
import type { Expense, Income } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BANK_NAME_PATTERN = /(STATE BANK OF INDIA|\bSBI\b|HDFC|ICICI|AXIS BANK|KOTAK MAHINDRA|KOTAK BANK|BANK OF BARODA|\bBOB\b|PUNJAB NATIONAL BANK|\bPNB\b|CANARA BANK|UNION BANK)/i;

export type ImportStatus = 'idle' | 'parsing' | 'review' | 'importing' | 'done' | 'error';

function guessBankName(fileName: string, narrations: string[]): string | null {
  const haystack = `${fileName} ${narrations.slice(0, 20).join(' ')}`;
  const match = haystack.match(BANK_NAME_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

export function useStatementImport() {
  const { expenses, addExpenses } = useExpenses();
  const { income, addIncomes } = useIncome();
  const { recordImport } = useStatementImports();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ReviewTransaction[]>([]);
  const [importSummary, setImportSummary] = useState<ImportOutcome | null>(null);

  const bankGuess = useMemo(
    () => (fileName ? guessBankName(fileName, rows.map((r) => r.narration)) : null),
    [fileName, rows]
  );

  const statementPeriod = useMemo(() => {
    const dates = rows.map((r) => r.date).filter((d): d is Date => d !== null);
    if (dates.length === 0) return { start: null, end: null };
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [rows]);

  const statementSummary = useMemo(() => summarizeStatement(rows), [rows]);

  // Informational only — every credit row (salary or not) is reviewable and
  // importable the same way; this just surfaces which ones look like salary.
  const salaryRowsTotal = useMemo(
    () => sumMoney(rows.filter((r) => r.type === 'credit' && r.included && r.category === 'Salary').map((r) => r.amount ?? 0)),
    [rows]
  );

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setImportSummary(null);
    setFileName(file.name);

    if (file.size > MAX_FILE_SIZE) {
      setStatus('error');
      setErrorMessage('File is too large (max 10MB).');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    setStatus('parsing');

    let result: { transactions: NormalizedTransaction[] } | { error: { message: string } };
    if (extension === 'csv') {
      result = await parseCsvFile(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      result = await parseExcelFile(file);
    } else if (extension === 'pdf') {
      result = await parsePdfFile(file);
    } else {
      setStatus('error');
      setErrorMessage('Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or PDF bank statement.');
      return;
    }

    if ('error' in result) {
      setStatus('error');
      setErrorMessage(result.error.message);
      return;
    }

    if (result.transactions.length === 0) {
      setStatus('error');
      setErrorMessage('No transactions could be extracted from this file.');
      return;
    }

    setRows(buildReviewTransactions(result.transactions, expenses, income));
    setStatus('review');
  };

  // A row that can't be saved (no direction/date/amount) can't be ticked —
  // ticking it would promise an import that then skips it.
  // A deposit still waiting for a category cannot be selected: selecting it would
  // promise an import that then skips it.
  const selectable = (r: ReviewTransaction) => isImportable(r) && !needsCategory(r) && !needsConfirmation(r);

  const toggleInclude = (rowId: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, included: !r.included && selectable(r) } : r)));
  };

  const toggleSelectAllByType = (type: 'debit' | 'credit', include: boolean) => {
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, included: include && selectable(r) } : r)));
  };

  /** The user's answer for a row whose direction the file didn't give. */
  const setRowType = (rowId: string, type: TransactionType) => {
    setRows((prev) => assignRowType(prev, rowId, type, expenses, income));
  };

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

  const updateDescription = (rowId: string, description: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, description } : r)));
  };

  const updateAmount = (rowId: string, amount: number) => {
    setRows((prev) => prev.map((r) => {
      if (r.rowId !== rowId) return r;
      const next = { ...r, amount, uncertain: false };
      return { ...next, included: next.included && isImportable(next) };
    }));
  };

  /** Imports all included, valid rows — debits as expenses, credits as income
   *  — so every credit (not just a single detected salary line) flows into
   *  the Monthly Earnings / cash-flow calculations. Never writes uncertain
   *  rows (missing date/amount/type) even if marked included. */
  const confirmImport = async () => {
    setStatus('importing');
    const plan = planImport(rows, `import-${Date.now()}`);
    const outcome = await executeImport(plan, {
      addExpenses: (records) => addExpenses(records as Omit<Expense, 'id' | 'userId'>[]),
      addIncomes: (records) => addIncomes(records as Omit<Income, 'id' | 'userId'>[]),
    });

    // History is a log entry only; the transactions above are already saved,
    // so a failure here must not leave the screen stuck on "Importing".
    try {
      await recordImport({
        fileName,
        bankGuess,
        statementPeriodStart: statementPeriod.start?.toISOString() ?? null,
        statementPeriodEnd: statementPeriod.end?.toISOString() ?? null,
        uploadedAt: new Date().toISOString(),
        transactionsExtracted: rows.length,
        expensesImported: outcome.expensesImported,
        incomeImported: outcome.incomeImported,
        transactionsSkipped: outcome.skipped,
        ...statementTotals(rows),
        status: outcome.status,
      });
    } catch (err) {
      console.error('Saving statement import history failed:', err);
    }

    setImportSummary(outcome);
    setStatus('done');
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage(null);
    setFileName('');
    setRows([]);
    setImportSummary(null);
  };

  return {
    status,
    errorMessage,
    fileName,
    rows,
    bankGuess,
    statementPeriod,
    statementSummary,
    salaryRowsTotal,
    importSummary,

    handleFile,
    toggleInclude,
    toggleSelectAllByType,
    setRowType,
    updateCategory,
    confirmRow,
    updateDescription,
    updateAmount,
    confirmImport,
    reset,
  };
}
