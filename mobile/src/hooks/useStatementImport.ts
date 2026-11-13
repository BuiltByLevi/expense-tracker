import { useMemo, useState } from 'react';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { parseStatement, pickStatementFile } from '@/services/statementFile';
import { buildReviewTransactions } from '@shared/statementReview';
import type { ReviewTransaction } from '@shared/statementParsers/types';
import type { IncomeCategory } from '@shared/types';

export type ImportStatus = 'idle' | 'parsing' | 'review' | 'importing' | 'done' | 'error';

export interface ImportSummary {
  expensesImported: number;
  incomeImported: number;
  skipped: number;
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

  const toggleInclude = (rowId: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, included: !r.included } : r)));
  };

  const setAllIncluded = (included: boolean) => {
    // Rows missing a date/type can never be written, so bulk-select must not
    // mark them included — it would promise an import that silently skips.
    setRows((prev) =>
      prev.map((r) =>
        r.type !== null && r.date !== null ? { ...r, included } : { ...r, included: false }
      )
    );
  };

  const updateCategory = (rowId: string, category: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, category, uncertain: false } : r))
    );
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
      creditTotal: included
        .filter((r) => r.type === 'credit')
        .reduce((s, r) => s + (r.amount ?? 0), 0),
      debitTotal: included
        .filter((r) => r.type === 'debit')
        .reduce((s, r) => s + (r.amount ?? 0), 0),
    };
  }, [rows]);

  /**
   * Writes included rows — debits as expenses, credits as income — so every
   * credit flows into Monthly Earnings / cash-flow, not just a detected
   * salary line. Rows missing date/amount/type are never written.
   */
  const confirmImport = async () => {
    setStatus('importing');
    const importId = `import-${Date.now()}`;

    const debitCandidates = rows.filter((r) => r.type === 'debit' && r.included);
    const validDebits = debitCandidates.filter((r) => r.date && r.amount !== null);
    const creditCandidates = rows.filter((r) => r.type === 'credit' && r.included);
    const validCredits = creditCandidates.filter((r) => r.date && r.amount !== null);

    let expensesImported = 0;
    let incomeImported = 0;
    let skipped =
      debitCandidates.length - validDebits.length + (creditCandidates.length - validCredits.length);

    try {
      if (validDebits.length > 0) {
        await addExpenses(
          validDebits.map((r) => ({
            amount: r.amount as number,
            category: r.category,
            description: r.description || r.narration,
            date: r.date as Date,
            source: 'import' as const,
            importId,
            originalNarration: r.narration,
            referenceNumber: r.referenceNumber ?? undefined,
          }))
        );
        expensesImported = validDebits.length;
      }

      if (validCredits.length > 0) {
        await addIncomes(
          validCredits.map((r) => ({
            amount: r.amount as number,
            category: r.category as IncomeCategory,
            description: r.description || r.narration,
            date: r.date as Date,
            source: 'import' as const,
            importId,
            originalNarration: r.narration,
            referenceNumber: r.referenceNumber ?? undefined,
          }))
        );
        incomeImported = validCredits.length;
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        'The import failed partway through. Some rows may already have been saved — check your transactions before retrying.'
      );
      return;
    }

    setSummary({ expensesImported, incomeImported, skipped });
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
    pickAndParse,
    toggleInclude,
    setAllIncluded,
    updateCategory,
    confirmImport,
    reset,
  };
}
