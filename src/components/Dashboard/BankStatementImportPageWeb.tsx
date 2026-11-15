import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { UploadIcon, AlertIcon, CheckCircleIcon, RupeeIcon } from '../common/FinanceIcons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type ExpenseCategory, type IncomeCategory } from '../../types';
import { useStatementImport } from '../../hooks/useStatementImport';
import { useLanguage } from '../../context/LanguageContext';

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

function expenseCategoryColor(category: string): string {
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(category);
  return categoryColors[idx % categoryColors.length];
}

const BankStatementImportPageWeb: React.FC<Props> = ({ onBack, onImported }) => {
  const { t } = useLanguage();
  const {
    status, errorMessage, fileName, rows, bankGuess, statementPeriod, salaryRowsTotal, importSummary,
    handleFile, toggleInclude, toggleSelectAllByType, updateCategory, updateDescription, updateAmount,
    confirmImport, reset,
  } = useStatementImport();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debitRows = rows.filter((r) => r.type === 'debit');
  const creditRows = rows.filter((r) => r.type === 'credit');
  const invalidRows = rows.filter((r) => r.type === null || r.date === null);
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
                              style={{ padding: '6px 8px', fontSize: '13px', color: INCOME_CATEGORY_COLORS[row.category as IncomeCategory] }}
                              value={row.category}
                              onChange={(e) => updateCategory(row.rowId, e.target.value as IncomeCategory)}
                            >
                              {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                                <span title="Looks like it may already be in your income" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
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
              <CheckCircleIcon size={34} color={design.colors.success} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
              {t(importSummary.imported === 1 ? 'import.importedSingular' : 'import.importedPlural', { count: importSummary.imported })}
            </p>
            {importSummary.skipped > 0 && (
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '6px 0 0 0' }}>
                {t('import.skippedWeb', { count: importSummary.skipped })}
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
