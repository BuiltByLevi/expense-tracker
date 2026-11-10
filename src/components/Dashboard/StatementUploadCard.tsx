import React from 'react';
import { format } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { useStatementImports } from '../../hooks/useStatementImports';

interface Props {
  onOpen: () => void;
}

/**
 * Dashboard teaser for the bank statement import feature — last-import
 * summary plus a button into the full upload/review flow. Deliberately
 * light so it doesn't compete visually with the existing KPI cards.
 */
const StatementUploadCard: React.FC<Props> = ({ onOpen }) => {
  const { imports, loading } = useStatementImports();
  const last = imports[0];

  return (
    <div className="glass-card animate-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: design.colors.primaryGradient, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px',
        }}>
          🏦
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
            Import Bank Statement
          </p>
          <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
            {loading
              ? 'Loading history...'
              : last
                ? `Last import: ${last.expensesImported + last.incomeImported} transactions on ${format(new Date(last.uploadedAt), 'dd MMM yyyy')}`
                : 'Upload a CSV, Excel, or PDF statement to auto-fill transactions'}
          </p>
        </div>
      </div>
      <button onClick={onOpen} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '13px', flexShrink: 0 }}>
        Upload Statement
      </button>
    </div>
  );
};

export default StatementUploadCard;
