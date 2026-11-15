import React from 'react';
import { theme as design } from '../../styles/theme';
import LedgerView from './LedgerView';
import { LedgerIcon } from '../common/FinanceIcons';
import { useLanguage } from '../../context/LanguageContext';

interface TransactionLedgerPageProps {
  onBack: () => void;
  /** The month the Dashboard was showing when navigating here (see LedgerView). */
  year?: number;
  month?: number;
}

/** Desktop Monthly Ledger: page header + the same banking-style ledger as the phone. */
const TransactionLedgerPage: React.FC<TransactionLedgerPageProps> = ({ onBack, year, month }) => {
  const { t } = useLanguage();
  return (
    <div style={{ minHeight: '100vh', padding: '10px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-card page-head animate-in">
          <span className="page-head-ico" style={{ background: design.colors.primaryGradient }}>
            <LedgerIcon size={20} color="#fff" strokeWidth={2.1} />
          </span>
          <div className="page-head-text">
            <h1 className="text-gradient">{t('dashboard.nav.ledger')}</h1>
            <p>{t('ledger.page.subtitle')}</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost page-head-back">
            <span aria-hidden="true">←</span>
            <span className="page-head-back-label">{t('dashboard.navSection.dashboard')}</span>
          </button>
        </div>
        <div className="bank-ui lg-wide">
          <LedgerView initialYear={year} initialMonth={month} />
        </div>
      </div>
    </div>
  );
};

export default TransactionLedgerPage;
