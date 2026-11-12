import React, { useRef } from 'react';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { UploadIcon, AlertIcon, CheckCircleIcon, RupeeIcon } from '../common/FinanceIcons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type ExpenseCategory, type IncomeCategory } from '../../types';
import { useStatementImport } from '../../hooks/useStatementImport';

interface Props {
  onBack: () => void;
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

const BankStatementImportPageMobile: React.FC<Props> = ({ onBack }) => {
  const {
    status, errorMessage, fileName, rows, bankGuess, statementPeriod, salaryRowsTotal, importSummary,
    handleFile, toggleInclude, toggleSelectAllByType, updateCategory, updateDescription, updateAmount,
    confirmImport, reset,
  } = useStatementImport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const debitRows = rows.filter((r) => r.type === 'debit');
  const creditRows = rows.filter((r) => r.type === 'credit');
  const allDebitsSelected = debitRows.length > 0 && debitRows.every((r) => r.included);
  const allCreditsSelected = creditRows.length > 0 && creditRows.every((r) => r.included);
  const selectedDebitCount = debitRows.filter((r) => r.included).length;
  const selectedCreditCount = creditRows.filter((r) => r.included).length;
  const totalSelected = selectedDebitCount + selectedCreditCount;

  return (
    <div className="glass-page" style={{ padding: '10px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '19px', fontWeight: 700, margin: 0 }}>Import Statement</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>CSV, Excel, or text-based PDF</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>← Back to Dashboard</button>
        </div>

        {status === 'idle' && (
          <div
            className="glass-card animate-in"
            style={{ padding: '32px 16px', textAlign: 'center' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 14px auto',
              background: `rgba(${design.colors.primaryRgb}, 0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadIcon size={28} color={design.colors.primary} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Tap to choose a statement file</p>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0' }}>
              .csv, .xlsx, .xls, or text-based .pdf — max 10MB. Scanned/image PDFs aren't supported yet.
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
          <div className="glass-card animate-in" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>Reading {fileName}...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card animate-in" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.danger, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <AlertIcon size={14} color={design.colors.danger} /> Couldn't process this file
            </p>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '0 0 16px 0' }}>{errorMessage}</p>
            <button onClick={reset} className="btn btn-primary" style={{ padding: '10px 20px', width: '100%' }}>Try another file</button>
          </div>
        )}

        {status === 'review' && (
          <>
            <div className="glass-card animate-in" style={{ padding: '14px 16px', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{fileName}</p>
              <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
                {bankGuess ? `${bankGuess} · ` : ''}{rows.length} transactions
                {statementPeriod.start && statementPeriod.end && ` · ${format(statementPeriod.start, 'dd MMM')} – ${format(statementPeriod.end, 'dd MMM yyyy')}`}
              </p>
            </div>

            {salaryRowsTotal > 0 && (
              <div className="glass-card animate-in" style={{ padding: '12px 14px', marginBottom: '12px', background: `linear-gradient(135deg, rgba(${design.colors.successRgb}, 0.08) 0%, rgba(${design.colors.primaryRgb}, 0.08) 100%)`, border: `1px solid ${design.colors.success}30` }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <RupeeIcon size={13} color={design.colors.success} style={{ flexShrink: 0 }} /> ₹{salaryRowsTotal.toLocaleString('en-IN')} in salary-looking credits — included in Income below.
                </p>
              </div>
            )}

            {/* Income cards */}
            <div className="glass-card animate-in" style={{ padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Income: {selectedCreditCount} of {creditRows.length} selected</span>
              {creditRows.length > 0 && (
                <button onClick={() => toggleSelectAllByType('credit', !allCreditsSelected)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>
                  {allCreditsSelected ? 'Select none' : 'Select all'}
                </button>
              )}
            </div>

            {creditRows.length === 0 ? (
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '0 0 12px 0', padding: '0 4px' }}>No credits found in this statement.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {creditRows.map((row) => (
                  <div key={row.rowId} className="glass-card" style={{ padding: '12px', opacity: row.included ? 1 : 0.5, borderLeft: `3px solid ${design.colors.success}40` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
                        <input type="checkbox" checked={row.included} onChange={() => toggleInclude(row.rowId)} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: design.colors.textSecondary, flexShrink: 0 }}>{row.date ? format(row.date, 'dd MMM') : '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {row.duplicateOf && (
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
                            {row.duplicateConfidence === 'exact' ? 'Duplicate' : 'Possible dup'}
                          </span>
                        )}
                        {row.uncertain && (
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: `rgba(${design.colors.primaryRgb}, 0.15)`, color: design.colors.primary, fontWeight: 600 }}>
                            Review
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      className="input"
                      style={{ padding: '8px 10px', fontSize: '13px', marginBottom: '8px' }}
                      value={row.description}
                      onChange={(e) => updateDescription(row.rowId, e.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '8px' }}>
                      <select
                        className="input"
                        style={{ padding: '8px', fontSize: '12px', color: INCOME_CATEGORY_COLORS[row.category as IncomeCategory] }}
                        value={row.category}
                        onChange={(e) => updateCategory(row.rowId, e.target.value as IncomeCategory)}
                      >
                        {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: '8px', fontSize: '13px', textAlign: 'right' }}
                        value={row.amount ?? ''}
                        onChange={(e) => updateAmount(row.rowId, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expense cards */}
            <div className="glass-card animate-in" style={{ padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Expenses: {selectedDebitCount} of {debitRows.length} selected</span>
              <button onClick={() => toggleSelectAllByType('debit', !allDebitsSelected)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>
                {allDebitsSelected ? 'Select none' : 'Select all'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {debitRows.map((row) => (
                <div key={row.rowId} className="glass-card" style={{ padding: '12px', opacity: row.included ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
                      <input type="checkbox" checked={row.included} onChange={() => toggleInclude(row.rowId)} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: design.colors.textSecondary, flexShrink: 0 }}>{row.date ? format(row.date, 'dd MMM') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {row.duplicateOf && (
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: design.colors.warning, fontWeight: 600 }}>
                          {row.duplicateConfidence === 'exact' ? 'Duplicate' : 'Possible dup'}
                        </span>
                      )}
                      {row.uncertain && (
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: `rgba(${design.colors.primaryRgb}, 0.15)`, color: design.colors.primary, fontWeight: 600 }}>
                          Review
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    className="input"
                    style={{ padding: '8px 10px', fontSize: '13px', marginBottom: '8px' }}
                    value={row.description}
                    onChange={(e) => updateDescription(row.rowId, e.target.value)}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '8px' }}>
                    <select
                      className="input"
                      style={{ padding: '8px', fontSize: '12px', color: expenseCategoryColor(row.category) }}
                      value={row.category}
                      onChange={(e) => updateCategory(row.rowId, e.target.value as ExpenseCategory)}
                    >
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      className="input"
                      style={{ padding: '8px', fontSize: '13px', textAlign: 'right' }}
                      value={row.amount ?? ''}
                      onChange={(e) => updateAmount(row.rowId, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => confirmImport()} disabled={totalSelected === 0} className="btn btn-primary" style={{ padding: '14px', width: '100%' }}>
                Import {totalSelected} {totalSelected === 1 ? 'transaction' : 'transactions'}
              </button>
              <button onClick={reset} className="btn btn-ghost" style={{ padding: '12px', width: '100%' }}>Cancel</button>
            </div>
          </>
        )}

        {status === 'importing' && (
          <div className="glass-card animate-in" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>Importing transactions...</p>
          </div>
        )}

        {status === 'done' && importSummary && (
          <div className="glass-card animate-in" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 14px auto',
              background: `rgba(${design.colors.successRgb}, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleIcon size={30} color={design.colors.success} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
              Imported {importSummary.imported} transaction{importSummary.imported === 1 ? '' : 's'}
            </p>
            {importSummary.skipped > 0 && (
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '6px 0 0 0' }}>
                {importSummary.skipped} skipped.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button onClick={onBack} className="btn btn-primary" style={{ padding: '12px', width: '100%' }}>Back to Dashboard</button>
              <button onClick={reset} className="btn btn-ghost" style={{ padding: '12px', width: '100%' }}>Import another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementImportPageMobile;
