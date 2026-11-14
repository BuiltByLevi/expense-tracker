import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import {
  UploadIcon, AlertIcon, CheckCircleIcon, RupeeIcon, BankIcon, ShieldCheckIcon, DocumentIcon, CheckIcon,
} from '../common/FinanceIcons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type IncomeCategory } from '../../types';
import { useStatementImport } from '../../hooks/useStatementImport';
import { useStatementImports } from '../../hooks/useStatementImports';
import type { ReviewTransaction } from '../../../shared/statementParsers/types';

interface Props {
  onBack: () => void;
}

/**
 * Mobile statement import, styled to match the banking-style shell:
 * upload card + recent imports → review (Income / Expenses tabs, compact
 * editable rows, fixed Import bar) → success summary. All parsing and
 * saving logic lives in useStatementImport; this file is presentation only.
 */

const INCOME_CATEGORY_COLORS: Record<IncomeCategory, string> = {
  Salary: design.colors.success,
  Interest: design.colors.primary,
  Refund: design.colors.warning,
  Transfer: design.colors.textSecondary,
  'Other Income': design.colors.textTertiary,
};

function expenseCategoryColor(category: string): string {
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(category);
  return categoryColors[Math.max(0, idx) % categoryColors.length];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const Spinner: React.FC<{ label: string; sub?: string }> = ({ label, sub }) => (
  <div className="glass-card si-state">
    <span className="si-spinner" aria-hidden="true" />
    <p className="si-state-title" role="status">{label}</p>
    {sub && <p className="si-state-sub">{sub}</p>}
  </div>
);

const Row: React.FC<{
  row: ReviewTransaction;
  onToggle: () => void;
  onDescription: (v: string) => void;
  onCategory: (v: string) => void;
  onAmount: (v: number) => void;
}> = ({ row, onToggle, onDescription, onCategory, onAmount }) => {
  const isCredit = row.type === 'credit';
  const categories = isCredit ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const dot = isCredit ? INCOME_CATEGORY_COLORS[row.category as IncomeCategory] ?? design.colors.success : expenseCategoryColor(row.category);
  return (
    <li className={`si-row ${row.included ? '' : 'off'}`}>
      <button
        type="button"
        className={`si-check ${row.included ? 'on' : ''}`}
        role="checkbox"
        aria-checked={row.included}
        aria-label={`Include ${row.description || 'transaction'}`}
        onClick={onToggle}
      >
        {row.included && <CheckIcon size={14} color="white" strokeWidth={3} />}
      </button>
      <div className="si-row-main">
        <input
          className="si-desc"
          value={row.description}
          onChange={(e) => onDescription(e.target.value)}
          aria-label="Description"
        />
        <div className="si-row-meta">
          <span className="si-date">{row.date ? format(row.date, 'dd MMM') : '—'}</span>
          <label className="si-cat">
            <span className="si-cat-dot" style={{ background: dot }} aria-hidden="true" />
            <select value={row.category} onChange={(e) => onCategory(e.target.value)} aria-label="Category">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {row.duplicateOf && (
            <span className="si-badge warn">{row.duplicateConfidence === 'exact' ? 'Duplicate' : 'Possible dup'}</span>
          )}
          {row.uncertain && <span className="si-badge">Review</span>}
        </div>
      </div>
      <label className={`si-amt ${isCredit ? 'in' : ''}`}>
        <span aria-hidden="true">{isCredit ? '+₹' : '₹'}</span>
        <input
          type="text"
          inputMode="decimal"
          value={row.amount ?? ''}
          onChange={(e) => onAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          style={{ width: `${Math.max(3, String(row.amount ?? '').length) + 1}ch` }}
          aria-label="Amount"
        />
      </label>
    </li>
  );
};

const BankStatementImportPageMobile: React.FC<Props> = ({ onBack }) => {
  const {
    status, errorMessage, fileName, rows, bankGuess, statementPeriod, salaryRowsTotal, importSummary,
    handleFile, toggleInclude, toggleSelectAllByType, updateCategory, updateDescription, updateAmount,
    confirmImport, reset,
  } = useStatementImport();
  const { imports, loading: historyLoading, refresh: refreshHistory } = useStatementImports();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'debit' | 'credit'>('debit');

  const debitRows = rows.filter((r) => r.type === 'debit');
  const creditRows = rows.filter((r) => r.type === 'credit');
  const selDebits = debitRows.filter((r) => r.included);
  const selCredits = creditRows.filter((r) => r.included);
  const totalSelected = selDebits.length + selCredits.length;
  const sum = (rs: ReviewTransaction[]) => rs.reduce((s, r) => s + (r.amount ?? 0), 0);
  const shownRows = tab === 'debit' ? debitRows : creditRows;
  const allShownSelected = shownRows.length > 0 && shownRows.every((r) => r.included);

  const startOver = () => {
    reset();
    setTab('debit');
    refreshHistory();
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again after an error
    if (f) handleFile(f);
  };

  return (
    <div className="si-page">
      {status === 'idle' && (
        <>
          <button type="button" className="si-hero" style={{ background: design.colors.primaryGradient }} onClick={() => fileInputRef.current?.click()}>
            <span className="si-hero-ico"><UploadIcon size={26} color="white" strokeWidth={1.8} /></span>
            <span className="si-hero-title">Upload bank statement</span>
            <span className="si-hero-sub">We read the transactions and let you check them before anything is saved.</span>
            <span className="si-hero-btn">Choose file</span>
            <span className="si-formats">
              <span>CSV</span><span>Excel</span><span>PDF</span><span>Max 10 MB</span>
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }} onChange={pickFile} />

          <div className="glass-card si-steps">
            {[
              ['1', 'Upload', 'Statement from your bank app or net banking'],
              ['2', 'Review', 'Fix categories, untick anything to skip'],
              ['3', 'Import', 'Transactions are added to your account'],
            ].map(([n, t, s]) => (
              <div key={n} className="si-step">
                <span className="si-step-n">{n}</span>
                <div><strong>{t}</strong><small>{s}</small></div>
              </div>
            ))}
          </div>

          <p className="si-note">
            <ShieldCheckIcon size={14} color={design.colors.success} />
            Your file is read on this device and never stored. Scanned or password-protected PDFs aren't supported yet.
          </p>

          <div className="m-section-head"><h2>Recent imports</h2></div>
          <div className="glass-card si-history">
            {historyLoading ? (
              <p className="si-empty">Loading…</p>
            ) : imports.length === 0 ? (
              <p className="si-empty">No statements imported yet.</p>
            ) : (
              <ul>
                {imports.slice(0, 5).map((imp) => (
                  <li key={imp.id}>
                    <span className="si-file-ico"><DocumentIcon size={18} color={design.colors.primary} /></span>
                    <div className="si-file-main">
                      <strong>{imp.bankGuess ?? imp.fileName}</strong>
                      <small>
                        {imp.statementPeriodStart && imp.statementPeriodEnd
                          ? `${format(new Date(imp.statementPeriodStart), 'dd MMM')} – ${format(new Date(imp.statementPeriodEnd), 'dd MMM yyyy')}`
                          : format(new Date(imp.uploadedAt), 'dd MMM yyyy')}
                      </small>
                    </div>
                    <div className="si-file-count">
                      <strong>{imp.expensesImported + imp.incomeImported}</strong>
                      <small>added</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {status === 'parsing' && <Spinner label={`Reading ${fileName}`} sub="Large PDFs can take a few seconds." />}
      {status === 'importing' && <Spinner label={`Importing ${totalSelected} transactions`} />}

      {status === 'error' && (
        <div className="glass-card si-state">
          <span className="si-state-ico err"><AlertIcon size={26} color={design.colors.danger} /></span>
          <p className="si-state-title">Couldn't read this file</p>
          <p className="si-state-sub">{errorMessage}</p>
          <button onClick={startOver} className="btn btn-primary si-wide">Try another file</button>
        </div>
      )}

      {status === 'review' && (
        <>
          <div className="si-summary" style={{ background: design.colors.primaryGradient }}>
            <div className="si-summary-head">
              <span className="si-hero-ico small"><BankIcon size={18} color="white" /></span>
              <div style={{ minWidth: 0 }}>
                <strong>{bankGuess ?? 'Bank statement'}</strong>
                <small>
                  {rows.length} transactions
                  {statementPeriod.start && statementPeriod.end && ` · ${format(statementPeriod.start, 'dd MMM')} – ${format(statementPeriod.end, 'dd MMM yyyy')}`}
                </small>
              </div>
            </div>
            <div className="si-summary-tiles">
              <div><small>Money in</small><strong>{inr(sum(selCredits))}</strong><small>{selCredits.length} selected</small></div>
              <div><small>Money out</small><strong>{inr(sum(selDebits))}</strong><small>{selDebits.length} selected</small></div>
            </div>
          </div>

          {salaryRowsTotal > 0 && (
            <p className="si-note">
              <RupeeIcon size={14} color={design.colors.success} />
              {inr(salaryRowsTotal)} looks like salary — it's in Money in.
            </p>
          )}

          <div className="glass-card" style={{ padding: '4px' }}>
            <div className="tab-container" style={{ width: '100%' }} role="tablist">
              <button role="tab" aria-selected={tab === 'debit'} onClick={() => setTab('debit')} className={`tab ${tab === 'debit' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>
                Expenses · {debitRows.length}
              </button>
              <button role="tab" aria-selected={tab === 'credit'} onClick={() => setTab('credit')} className={`tab ${tab === 'credit' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>
                Income · {creditRows.length}
              </button>
            </div>
          </div>

          <div className="m-section-head">
            <h2>{(tab === 'debit' ? selDebits : selCredits).length} of {shownRows.length} selected</h2>
            {shownRows.length > 0 && (
              <button className="m-link" onClick={() => toggleSelectAllByType(tab, !allShownSelected)}>
                {allShownSelected ? 'Select none' : 'Select all'}
              </button>
            )}
          </div>

          {shownRows.length === 0 ? (
            <div className="glass-card"><p className="si-empty">No {tab === 'debit' ? 'expenses' : 'income'} found in this statement.</p></div>
          ) : (
            <ul className="glass-card si-list">
              {shownRows.map((row) => (
                <Row
                  key={row.rowId}
                  row={row}
                  onToggle={() => toggleInclude(row.rowId)}
                  onDescription={(v) => updateDescription(row.rowId, v)}
                  onCategory={(v) => updateCategory(row.rowId, v)}
                  onAmount={(v) => updateAmount(row.rowId, v)}
                />
              ))}
            </ul>
          )}

          <div className="si-bar">
            <button onClick={startOver} className="si-cancel">Cancel</button>
            <button onClick={() => confirmImport()} disabled={totalSelected === 0} className="si-go" style={{ background: design.colors.primaryGradient }}>
              Import {totalSelected} {totalSelected === 1 ? 'transaction' : 'transactions'}
            </button>
          </div>
        </>
      )}

      {status === 'done' && importSummary && (
        <div className="glass-card si-state">
          <span className="si-state-ico ok"><CheckCircleIcon size={30} color={design.colors.success} strokeWidth={1.8} /></span>
          <p className="si-state-title">
            {importSummary.imported} transaction{importSummary.imported === 1 ? '' : 's'} imported
          </p>
          <p className="si-state-sub">
            {importSummary.skipped > 0 ? `${importSummary.skipped} skipped. ` : ''}They now show in Transactions and your totals.
          </p>
          <button onClick={onBack} className="btn btn-primary si-wide">Go to Home</button>
          <button onClick={startOver} className="btn btn-ghost si-wide">Import another statement</button>
        </div>
      )}
    </div>
  );
};

export default BankStatementImportPageMobile;
