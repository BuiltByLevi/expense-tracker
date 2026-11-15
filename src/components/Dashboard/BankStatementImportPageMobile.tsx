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
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../i18n';

interface Props {
  onBack: () => void;
  /** Called with the statement's last covered month before onBack, so Home
   *  lands on a month that actually has the just-imported transactions
   *  instead of silently staying on whatever month (often the current one)
   *  was selected before the import. */
  onImported?: (year: number, month: number) => void;
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
  const { t } = useLanguage();
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
            <span className="si-badge warn">{row.duplicateConfidence === 'exact' ? t('import.duplicate') : t('import.possibleDup')}</span>
          )}
          {row.uncertain && <span className="si-badge">{t('import.review')}</span>}
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

const BankStatementImportPageMobile: React.FC<Props> = ({ onBack, onImported }) => {
  const { t } = useLanguage();
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
  const duplicatesUnselected = rows.filter((r) => r.duplicateOf && !r.included).length;
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
            <span className="si-hero-title">{t('import.mobile.heroTitle')}</span>
            <span className="si-hero-sub">{t('import.mobile.heroSub')}</span>
            <span className="si-hero-btn">{t('import.mobile.chooseFile')}</span>
            <span className="si-formats">
              <span>CSV</span><span>Excel</span><span>PDF</span><span>{t('import.mobile.maxSize')}</span>
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }} onChange={pickFile} />

          <div className="glass-card si-steps">
            {([
              ['1', 'import.mobile.step1Title', 'import.mobile.step1Sub'],
              ['2', 'import.mobile.step2Title', 'import.mobile.step2Sub'],
              ['3', 'import.mobile.step3Title', 'import.mobile.step3Sub'],
            ] as [string, TranslationKey, TranslationKey][]).map(([n, titleKey, subKey]) => (
              <div key={n} className="si-step">
                <span className="si-step-n">{n}</span>
                <div><strong>{t(titleKey)}</strong><small>{t(subKey)}</small></div>
              </div>
            ))}
          </div>

          <p className="si-note">
            <ShieldCheckIcon size={14} color={design.colors.success} />
            {t('import.mobile.privacyNote')}
          </p>

          <div className="m-section-head"><h2>{t('import.mobile.recentImports')}</h2></div>
          <div className="glass-card si-history">
            {historyLoading ? (
              <p className="si-empty">{t('common.loading')}</p>
            ) : imports.length === 0 ? (
              <p className="si-empty">{t('import.mobile.noImports')}</p>
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
                      <small>{t('import.mobile.added')}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {status === 'parsing' && <Spinner label={t('import.mobile.readingFile', { fileName })} sub={t('import.mobile.largePdfHint')} />}
      {status === 'importing' && <Spinner label={t('import.mobile.importingCount', { count: totalSelected })} />}

      {status === 'error' && (
        <div className="glass-card si-state">
          <span className="si-state-ico err"><AlertIcon size={26} color={design.colors.danger} /></span>
          <p className="si-state-title">{t('import.mobile.errorTitle')}</p>
          <p className="si-state-sub">{errorMessage}</p>
          <button onClick={startOver} className="btn btn-primary si-wide">{t('import.tryAnother')}</button>
        </div>
      )}

      {status === 'review' && (
        <>
          <div className="si-summary" style={{ background: design.colors.primaryGradient }}>
            <div className="si-summary-head">
              <span className="si-hero-ico small"><BankIcon size={18} color="white" /></span>
              <div style={{ minWidth: 0 }}>
                <strong>{bankGuess ?? t('import.mobile.bankStatementFallback')}</strong>
                <small>
                  {t('import.transactionsCount', { count: rows.length })}
                  {statementPeriod.start && statementPeriod.end && ` · ${format(statementPeriod.start, 'dd MMM')} – ${format(statementPeriod.end, 'dd MMM yyyy')}`}
                </small>
              </div>
            </div>
            <div className="si-summary-tiles">
              <div><small>{t('import.mobile.moneyIn')}</small><strong>{inr(sum(selCredits))}</strong><small>{t('common.selectedCount', { count: selCredits.length })}</small></div>
              <div><small>{t('import.mobile.moneyOut')}</small><strong>{inr(sum(selDebits))}</strong><small>{t('common.selectedCount', { count: selDebits.length })}</small></div>
            </div>
          </div>

          {salaryRowsTotal > 0 && (
            <p className="si-note">
              <RupeeIcon size={14} color={design.colors.success} />
              {t('import.mobile.salaryNote', { amount: inr(salaryRowsTotal) })}
            </p>
          )}

          {duplicatesUnselected > 0 && (
            <p className="si-note">
              <AlertIcon size={14} color={design.colors.warning} />
              {t(duplicatesUnselected === 1 ? 'import.duplicatesUnselectedSingular' : 'import.duplicatesUnselectedPlural', { count: duplicatesUnselected })}
            </p>
          )}

          <div className="glass-card" style={{ padding: '4px' }}>
            <div className="tab-container" style={{ width: '100%' }} role="tablist">
              <button role="tab" aria-selected={tab === 'debit'} onClick={() => setTab('debit')} className={`tab ${tab === 'debit' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>
                {t('import.mobile.expensesTab', { count: debitRows.length })}
              </button>
              <button role="tab" aria-selected={tab === 'credit'} onClick={() => setTab('credit')} className={`tab ${tab === 'credit' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>
                {t('import.mobile.incomeTab', { count: creditRows.length })}
              </button>
            </div>
          </div>

          <div className="m-section-head">
            <h2>{t('import.mobile.selectedOfShown', { selected: (tab === 'debit' ? selDebits : selCredits).length, total: shownRows.length })}</h2>
            {shownRows.length > 0 && (
              <button className="m-link" onClick={() => toggleSelectAllByType(tab, !allShownSelected)}>
                {allShownSelected ? t('import.selectNone') : t('import.selectAll')}
              </button>
            )}
          </div>

          {shownRows.length === 0 ? (
            <div className="glass-card"><p className="si-empty">{t(tab === 'debit' ? 'import.mobile.noneFoundExpenses' : 'import.mobile.noneFoundIncome')}</p></div>
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
            <button onClick={startOver} className="si-cancel">{t('common.cancel')}</button>
            <button onClick={() => confirmImport()} disabled={totalSelected === 0} className="si-go" style={{ background: design.colors.primaryGradient }}>
              {t(totalSelected === 1 ? 'import.importCountSingular' : 'import.importCountPlural', { count: totalSelected })}
            </button>
          </div>
        </>
      )}

      {status === 'done' && importSummary && (
        <div className="glass-card si-state">
          <span className="si-state-ico ok"><CheckCircleIcon size={30} color={design.colors.success} strokeWidth={1.8} /></span>
          <p className="si-state-title">
            {t(importSummary.imported === 1 ? 'import.importedSingular' : 'import.importedPlural', { count: importSummary.imported })}
          </p>
          <p className="si-state-sub">
            {importSummary.skipped > 0 ? t('import.mobile.skippedPrefix', { count: importSummary.skipped }) : ''}{t('import.mobile.doneBody')}
          </p>
          <button
            onClick={() => {
              if (statementPeriod.end) onImported?.(statementPeriod.end.getFullYear(), statementPeriod.end.getMonth());
              onBack();
            }}
            className="btn btn-primary si-wide"
          >
            {t('import.mobile.goHome')}
          </button>
          <button onClick={startOver} className="btn btn-ghost si-wide">{t('import.mobile.importAnotherStatement')}</button>
        </div>
      )}
    </div>
  );
};

export default BankStatementImportPageMobile;
