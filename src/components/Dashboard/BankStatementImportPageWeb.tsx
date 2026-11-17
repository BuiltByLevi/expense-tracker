import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { UploadIcon, AlertIcon, CheckCircleIcon, CheckIcon, RupeeIcon } from '../common/FinanceIcons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type ExpenseCategory, type IncomeCategory } from '../../types';
import { useStatementImport } from '../../hooks/useStatementImport';
import { needsCategory, needsConfirmation, needsDirection } from '../../../shared/statementReview';
import { useLanguage } from '../../context/useLanguage';

interface Props {
  onBack: () => void;
  /** Called with the statement's last covered month before onBack, so the
   *  Dashboard lands on a month that actually has the just-imported
   *  transactions instead of silently staying on whatever month (often the
   *  current one) was selected before the import. */
  onImported?: (year: number, month: number) => void;
}

const INCOME_CATEGORY_COLORS: Record<IncomeCategory, string> = {
  Salary: design.colors.success,
  Interest: design.colors.primary,
  Refund: design.colors.warning,
  Transfer: design.colors.textSecondary,
  'Other Income': design.colors.textTertiary,
};

const money = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function expenseCategoryColor(category: string): string {
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(category);
  return categoryColors[idx % categoryColors.length];
}

const BankStatementImportPageWeb: React.FC<Props> = ({ onBack, onImported }) => {
  const { t } = useLanguage();
  const {
    status, errorMessage, fileName, rows, bankGuess, statementPeriod, statementSummary, salaryRowsTotal, importSummary,
    handleFile, toggleInclude, toggleSelectAllByType, setRowType, updateCategory, confirmRow, updateDescription, updateAmount,
    confirmImport, reset,
  } = useStatementImport();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debitRows = rows.filter((r) => r.type === 'debit');
  const creditRows = rows.filter((r) => r.type === 'credit');
  // Rows the file lists (date + amount) but without a direction: the user
  // decides. Rows missing a date or amount altogether can't be saved at all.
  const undecidedRows = rows.filter(needsDirection);
  const invalidRows = rows.filter((r) => (r.type === null || r.date === null) && !needsDirection(r));
  const duplicatesUnselected = rows.filter((r) => r.duplicateOf && !r.included).length;
  const allDebitsSelected = debitRows.length > 0 && debitRows.every((r) => r.included);
  const allCreditsSelected = creditRows.length > 0 && creditRows.every((r) => r.included);
  const selectedDebitCount = debitRows.filter((r) => r.included).length;
  const selectedCreditCount = creditRows.filter((r) => r.included).length;
  const totalSelected = selectedDebitCount + selectedCreditCount;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="glass-page">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div className="glass-card animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', marginBottom: '20px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{t('import.page.title')}</h1>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
              {t('import.page.subtitle')}
            </p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '10px 20px' }}>← {t('import.backToDashboard')}</button>
        </div>

        {status === 'idle' && (
          <div
            className="glass-card animate-in"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              padding: '48px', textAlign: 'center', cursor: 'pointer',
              border: dragOver ? `2px dashed ${design.colors.primary}` : '2px dashed transparent',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 16px auto',
              background: `rgba(${design.colors.primaryRgb}, 0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadIcon size={32} color={design.colors.primary} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
              {t('import.dropHint')}
            </p>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '8px 0 0 0' }}>
              {t('import.formatsHint')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {status === 'parsing' && (
          <div className="glass-card animate-in" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary }}>{t('import.reading', { fileName })}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card animate-in" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.danger, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
              <AlertIcon size={15} color={design.colors.danger} /> {t('import.errorTitle')}
            </p>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '0 0 20px 0' }}>{errorMessage}</p>
            <button onClick={reset} className="btn btn-primary" style={{ padding: '10px 24px' }}>{t('import.tryAnother')}</button>
          </div>
        )}

        {status === 'review' && (
          <>
            <div className="glass-card animate-in" style={{ padding: '16px 24px', marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.fileLabel')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{fileName}</p></div>
              {bankGuess && <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.bankLabel')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{bankGuess}</p></div>}
              {statementPeriod.start && statementPeriod.end && (
                <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.periodLabel')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{format(statementPeriod.start, 'dd MMM yyyy')} – {format(statementPeriod.end, 'dd MMM yyyy')}</p></div>
              )}
              <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.extractedLabel')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{t('import.transactionsCount', { count: rows.length })}</p></div>
            </div>

            {statementSummary.reconciled !== null && statementSummary.openingBalance !== null && statementSummary.closingBalance !== null && (
              <div className="glass-card animate-in" style={{ padding: '16px 24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.statement.opening')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{money(statementSummary.openingBalance)}</p></div>
                  <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.statement.withdrawals', { count: statementSummary.debitCount })}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{money(statementSummary.totalDebits)}</p></div>
                  <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.statement.deposits', { count: statementSummary.creditCount })}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{money(statementSummary.totalCredits)}</p></div>
                  <div><p style={{ fontSize: '10px', color: design.colors.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{t('import.statement.closing')}</p><p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0' }}>{money(statementSummary.closingBalance)}</p></div>
                </div>
                <p style={{ fontSize: '12px', color: design.colors.textPrimary, margin: '12px 0 0 0', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {statementSummary.reconciled
                    ? <CheckIcon size={13} color={design.colors.success} style={{ flexShrink: 0 }} />
                    : <AlertIcon size={13} color={design.colors.warning} style={{ flexShrink: 0 }} />}
                  {statementSummary.reconciled
                    ? t('import.statement.reconciled')
                    : t('import.statement.notReconciled', { amount: money(Math.abs(statementSummary.difference)) })}
                </p>
              </div>
            )}

            {salaryRowsTotal > 0 && (
              <div className="glass-card animate-in" style={{ padding: '14px 24px', marginBottom: '16px', background: `linear-gradient(135deg, rgba(${design.colors.successRgb}, 0.08) 0%, rgba(${design.colors.primaryRgb}, 0.08) 100%)`, border: `1px solid ${design.colors.success}30` }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RupeeIcon size={14} color={design.colors.success} /> {t('import.salaryDetected', { amount: salaryRowsTotal.toLocaleString('en-IN') })}
                </p>
              </div>
            )}

            {invalidRows.length > 0 && (
              <div className="glass-card animate-in" style={{ padding: '12px 24px', marginBottom: '16px', background: 'rgba(245, 158, 11, 0.08)', border: `1px solid ${design.colors.warning}30` }}>
                <p style={{ fontSize: '12px', color: design.colors.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <AlertIcon size={13} color={design.colors.warning} style={{ flexShrink: 0 }} />
                  {t(invalidRows.length === 1 ? 'import.invalidRowsSingular' : 'import.invalidRowsPlural', { count: invalidRows.length })}
                </p>
              </div>
            )}

            {undecidedRows.length > 0 && (
              <div className="glass-card animate-in" style={{ padding: '14px 24px', marginBottom: '16px', border: `1px solid ${design.colors.warning}30` }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                  {t('import.needsDirectionTitle', { count: undecidedRows.length })}
                </h3>
                <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 10px 0' }}>{t('import.needsDirectionHint')}</p>
                {undecidedRows.map((row) => (
                  <div key={row.rowId} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '13px' }}>
                    <span style={{ color: design.colors.textSecondary, whiteSpace: 'nowrap' }}>{row.date ? format(row.date, 'dd MMM yyyy') : '—'}</span>
                    <span style={{ flex: 1, minWidth: '180px', color: design.colors.textPrimary }}>{row.narration}</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{money(row.amount ?? 0)}</strong>
                    <button onClick={() => setRowType(row.rowId, 'credit')} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.markMoneyIn')}</button>
                    <button onClick={() => setRowType(row.rowId, 'debit')} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.markMoneyOut')}</button>
                  </div>
                ))}
              </div>
            )}

            {duplicatesUnselected > 0 && (
              <div className="glass-card animate-in" style={{ padding: '12px 24px', marginBottom: '16px', background: 'rgba(245, 158, 11, 0.08)', border: `1px solid ${design.colors.warning}30` }}>
                <p style={{ fontSize: '12px', color: design.colors.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <AlertIcon size={13} color={design.colors.warning} style={{ flexShrink: 0 }} />
                  {t(duplicatesUnselected === 1 ? 'import.duplicatesUnselectedSingular' : 'import.duplicatesUnselectedPlural', { count: duplicatesUnselected })}
                </p>
              </div>
            )}

            {/* Income table */}
            <div className="glass-card animate-in" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '14px 24px', borderBottom: `1px solid ${design.colors.success}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                  {t('import.incomeTitle', { selected: selectedCreditCount, total: creditRows.length })}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleSelectAllByType('credit', true)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.selectAll')}</button>
                  <button onClick={() => toggleSelectAllByType('credit', false)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.selectNone')}</button>
                </div>
              </div>
              {creditRows.length === 0 ? (
                <p style={{ padding: '20px 24px', fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>{t('import.noCredits')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: `rgba(${design.colors.successRgb}, 0.04)` }}>
                        <th style={{ padding: '10px 12px 10px 24px', width: '32px' }}>
                          <input type="checkbox" aria-label="Select all income" checked={allCreditsSelected} onChange={(e) => toggleSelectAllByType('credit', e.target.checked)} />
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colDate')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colDescription')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colCategory')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colAmount')}</th>
                        <th style={{ padding: '10px 24px 10px 12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colFlags')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditRows.map((row) => (
                        <tr key={row.rowId} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', opacity: row.included ? 1 : 0.5 }}>
                          <td style={{ padding: '10px 12px 10px 24px' }}>
                            <input type="checkbox" checked={row.included} disabled={needsConfirmation(row)} onChange={() => toggleInclude(row.rowId)} />
                          </td>
                          <td style={{ padding: '10px 12px', color: design.colors.textSecondary, whiteSpace: 'nowrap' }}>
                            {row.date ? format(row.date, 'dd MMM yyyy') : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: '220px' }}>
                            <input
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '13px' }}
                              value={row.description}
                              onChange={(e) => updateDescription(row.rowId, e.target.value)}
                            />
                            {row.description !== row.narration && (
                              <p style={{ fontSize: '10px', color: design.colors.textTertiary, margin: '4px 0 0 0' }}>{t('import.originalLabel', { text: row.narration })}</p>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <select
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '13px', color: INCOME_CATEGORY_COLORS[row.category as IncomeCategory] }}
                              value={row.category}
                              onChange={(e) => updateCategory(row.rowId, e.target.value as IncomeCategory)}
                            >
                              {/* An unassigned deposit has no category: show a placeholder, never the first option. */}
                              {!row.category && <option value="" disabled>{t('import.chooseCategory')}</option>}
                              {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {needsConfirmation(row) && (
                              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', color: design.colors.textSecondary, maxWidth: '260px' }}>{t('import.suggestedTransferHint')}</span>
                                <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => confirmRow(row.rowId)}>
                                  {t('import.confirmSuggestion')}
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'right', width: '110px' }}
                              value={row.amount ?? ''}
                              onChange={(e) => updateAmount(row.rowId, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ padding: '10px 24px 10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {row.duplicateOf && (
                                <span title="Looks like it may already be in your income" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
                                  {row.duplicateConfidence === 'exact' ? t('import.duplicate') : t('import.possibleDup')}
                                </span>
                              )}
                              {needsCategory(row) && (
                                <span title={t('import.needsCategoryHint')} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
                                  {t('import.chooseCategory')}
                                </span>
                              )}
                              {row.uncertain && !needsCategory(row) && (
                                <span title={row.parseIssue ?? 'Low-confidence category'} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `rgba(${design.colors.primaryRgb}, 0.15)`, color: design.colors.primary, fontWeight: 600 }}>
                                  {t('import.review')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expense table */}
            <div className="glass-card animate-in" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '14px 24px', borderBottom: `1px solid ${design.colors.primary}15`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                  {t('import.expenseTitle', { selected: selectedDebitCount, total: debitRows.length })}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleSelectAllByType('debit', true)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.selectAll')}</button>
                  <button onClick={() => toggleSelectAllByType('debit', false)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('import.selectNone')}</button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <th style={{ padding: '10px 12px 10px 24px', width: '32px' }}>
                        <input type="checkbox" aria-label="Select all expenses" checked={allDebitsSelected} onChange={(e) => toggleSelectAllByType('debit', e.target.checked)} />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colDate')}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colDescription')}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colCategory')}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colAmount')}</th>
                      <th style={{ padding: '10px 24px 10px 12px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: design.colors.textSecondary }}>{t('import.colFlags')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitRows.map((row) => (
                      <tr key={row.rowId} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', opacity: row.included ? 1 : 0.5 }}>
                        <td style={{ padding: '10px 12px 10px 24px' }}>
                          <input type="checkbox" checked={row.included} onChange={() => toggleInclude(row.rowId)} />
                        </td>
                        <td style={{ padding: '10px 12px', color: design.colors.textSecondary, whiteSpace: 'nowrap' }}>
                          {row.date ? format(row.date, 'dd MMM yyyy') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', minWidth: '220px' }}>
                          <input
                            className="input"
                            style={{ padding: '6px 8px', fontSize: '13px' }}
                            value={row.description}
                            onChange={(e) => updateDescription(row.rowId, e.target.value)}
                          />
                          {row.description !== row.narration && (
                            <p style={{ fontSize: '10px', color: design.colors.textTertiary, margin: '4px 0 0 0' }}>{t('import.originalLabel', { text: row.narration })}</p>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            className="input"
                            style={{ padding: '6px 8px', fontSize: '13px', color: expenseCategoryColor(row.category) }}
                            value={row.category}
                            onChange={(e) => updateCategory(row.rowId, e.target.value as ExpenseCategory)}
                          >
                            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input
                            type="number"
                            className="input"
                            style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'right', width: '110px' }}
                            value={row.amount ?? ''}
                            onChange={(e) => updateAmount(row.rowId, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td style={{ padding: '10px 24px 10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {row.duplicateOf && (
                              <span title="Looks like it may already be in your expenses" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
                                {row.duplicateConfidence === 'exact' ? t('import.duplicate') : t('import.possibleDup')}
                              </span>
                            )}
                            {row.uncertain && (
                              <span title={row.parseIssue ?? 'Low-confidence category'} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `rgba(${design.colors.primaryRgb}, 0.15)`, color: design.colors.primary, fontWeight: 600 }}>
                                {t('import.review')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={reset} className="btn btn-ghost" style={{ padding: '12px 24px' }}>{t('common.cancel')}</button>
              <button onClick={() => confirmImport()} disabled={totalSelected === 0} className="btn btn-primary" style={{ padding: '12px 28px' }}>
                {t(totalSelected === 1 ? 'import.importCountSingular' : 'import.importCountPlural', { count: totalSelected })}
              </button>
            </div>
          </>
        )}

        {status === 'importing' && (
          <div className="glass-card animate-in" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary }}>{t('import.importing')}</p>
          </div>
        )}

        {status === 'done' && importSummary && (
          <div className="glass-card animate-in" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px auto',
              background: `rgba(${design.colors.successRgb}, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {importSummary.imported > 0
                ? <CheckCircleIcon size={34} color={design.colors.success} strokeWidth={1.8} />
                : <AlertIcon size={34} color={design.colors.danger} strokeWidth={1.8} />}
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
              {importSummary.imported === 0 && importSummary.failed > 0
                ? t('import.nothingSaved')
                : t(importSummary.imported === 1 ? 'import.importedSingular' : 'import.importedPlural', { count: importSummary.imported })}
            </p>
            {importSummary.failed > 0 && (
              <p role="alert" style={{ fontSize: '13px', color: design.colors.danger, margin: '8px auto 0 auto', maxWidth: '520px' }}>
                {t('import.saveFailed', { count: importSummary.failed })}
              </p>
            )}
            {importSummary.skipped - importSummary.failed > 0 && (
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '6px 0 0 0' }}>
                {t('import.skippedWeb', { count: importSummary.skipped - importSummary.failed })}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button onClick={reset} className="btn btn-ghost" style={{ padding: '10px 24px' }}>{t('import.importAnother')}</button>
              <button
                onClick={() => {
                  if (statementPeriod.end) onImported?.(statementPeriod.end.getFullYear(), statementPeriod.end.getMonth());
                  onBack();
                }}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                {t('import.backToDashboard')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementImportPageWeb;
