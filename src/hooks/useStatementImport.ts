import { useMemo, useState } from 'react';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import { useStatementImports } from './useStatementImports';
import { parseCsvFile } from '../utils/statementParsers/csvParser';
import { parseExcelFile } from '../utils/statementParsers/excelParser';
import { parsePdfFile } from '../utils/statementParsers/pdfParser';
import { suggestCategory, suggestIncomeCategory } from '../utils/classification';
import { findDuplicate } from '../utils/duplicateDetection';
import type { NormalizedTransaction, ReviewTransaction } from '../utils/statementParsers/types';
import type { IncomeCategory } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BANK_NAME_PATTERN = /(STATE BANK OF INDIA|\bSBI\b|HDFC|ICICI|AXIS BANK|KOTAK MAHINDRA|KOTAK BANK|BANK OF BARODA|\bBOB\b|PUNJAB NATIONAL BANK|\bPNB\b|CANARA BANK|UNION BANK)/i;

export type ImportStatus = 'idle' | 'parsing' | 'review' | 'importing' | 'done' | 'error';

function guessBankName(fileName: string, narrations: string[]): string | null {
  const haystack = `${fileName} ${narrations.slice(0, 20).join(' ')}`;
  const match = haystack.match(BANK_NAME_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

function toReviewTransactions(
  transactions: NormalizedTransaction[],
  existingExpenses: ReturnType<typeof useExpenses>['expenses'],
  existingIncome: ReturnType<typeof useIncome>['income']
): ReviewTransaction[] {
  return transactions.map((tx, idx) => {
    const { category, uncertain: categoryUncertain } =
      tx.type === 'credit' ? suggestIncomeCategory(tx.narration) : suggestCategory(tx.narration);
    const duplicate =
      tx.type === 'debit'
        ? findDuplicate(tx, existingExpenses, tx.referenceNumber)
        : tx.type === 'credit'
          ? findDuplicate(tx, existingIncome, tx.referenceNumber)
          : null;

    return {
      ...tx,
      rowId: `row-${idx}-${tx.date?.getTime() ?? 0}-${tx.amount ?? 0}`,
      category,
      description: tx.narration,
      isSalaryCandidate: tx.type === 'credit' && category === 'Salary',
      uncertain: categoryUncertain || !!tx.parseIssue || tx.type === null || tx.date === null,
      duplicateOf: duplicate?.duplicateOf ?? null,
      duplicateConfidence: duplicate?.confidence ?? null,
      // Don't pre-select rows we can't confidently place, or that look like duplicates.
      included: tx.type !== null && tx.date !== null && !duplicate,
    };
  });
}

export function useStatementImport() {
  const { expenses, addExpenses } = useExpenses();
  const { income, addIncomes } = useIncome();
  const { recordImport } = useStatementImports();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ReviewTransaction[]>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);

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

  // Informational only — every credit row (salary or not) is reviewable and
  // importable the same way; this just surfaces which ones look like salary.
  const salaryRowsTotal = useMemo(
    () =>
      rows
        .filter((r) => r.type === 'credit' && r.included && r.category === 'Salary')
        .reduce((sum, r) => sum + (r.amount ?? 0), 0),
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

    setRows(toReviewTransactions(result.transactions, expenses, income));
    setStatus('review');
  };

  const toggleInclude = (rowId: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, included: !r.included } : r)));
  };

  const toggleSelectAllByType = (type: 'debit' | 'credit', include: boolean) => {
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, included: include } : r)));
  };

  const updateCategory = (rowId: string, category: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, category, uncertain: false } : r)));
  };

  const updateDescription = (rowId: string, description: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, description } : r)));
  };

  const updateAmount = (rowId: string, amount: number) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, amount, uncertain: false } : r)));
  };

  /** Imports all included, valid rows — debits as expenses, credits as income
   *  — so every credit (not just a single detected salary line) flows into
   *  the Monthly Earnings / cash-flow calculations. Never writes uncertain
   *  rows (missing date/amount/type) even if marked included. */
  const confirmImport = async () => {
    setStatus('importing');
    const importId = `import-${Date.now()}`;

    const debitCandidates = rows.filter((row) => row.type === 'debit' && row.included);
    const validDebits = debitCandidates.filter((row) => row.date && row.amount !== null);
    const creditCandidates = rows.filter((row) => row.type === 'credit' && row.included);
    const validCredits = creditCandidates.filter((row) => row.date && row.amount !== null);

    let expensesImported = 0;
    let incomeImported = 0;
    let skipped = (debitCandidates.length - validDebits.length) + (creditCandidates.length - validCredits.length);

    if (validDebits.length > 0) {
      try {
        await addExpenses(validDebits.map((row) => ({
          amount: row.amount as number,
          category: row.category,
          description: row.description || row.narration,
          date: row.date as Date,
          source: 'import' as const,
          importId,
          originalNarration: row.narration,
          referenceNumber: row.referenceNumber ?? undefined,
        })));
        expensesImported = validDebits.length;
      } catch {
        skipped += validDebits.length;
      }
    }

    if (validCredits.length > 0) {
      try {
        await addIncomes(validCredits.map((row) => ({
          amount: row.amount as number,
          category: row.category as IncomeCategory,
          description: row.description || row.narration,
          date: row.date as Date,
          source: 'import' as const,
          importId,
          originalNarration: row.narration,
          referenceNumber: row.referenceNumber ?? undefined,
        })));
        incomeImported = validCredits.length;
      } catch {
        skipped += validCredits.length;
      }
    }

    const creditsTotal = rows.filter((r) => r.type === 'credit').reduce((s, r) => s + (r.amount ?? 0), 0);
    const debitsTotal = rows.filter((r) => r.type === 'debit').reduce((s, r) => s + (r.amount ?? 0), 0);
    const imported = expensesImported + incomeImported;

    await recordImport({
      fileName,
      bankGuess,
      statementPeriodStart: statementPeriod.start?.toISOString() ?? null,
      statementPeriodEnd: statementPeriod.end?.toISOString() ?? null,
      uploadedAt: new Date().toISOString(),
      transactionsExtracted: rows.length,
      expensesImported,
      incomeImported,
      transactionsSkipped: rows.length - imported,
      creditsTotal,
      debitsTotal,
      status: skipped === 0 ? 'completed' : imported > 0 ? 'partial' : 'failed',
    });

    setImportSummary({ imported, skipped });
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
    salaryRowsTotal,
    importSummary,

    handleFile,
    toggleInclude,
    toggleSelectAllByType,
    updateCategory,
    updateDescription,
    updateAmount,
    confirmImport,
    reset,
  };
}
