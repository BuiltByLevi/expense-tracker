import React from 'react';
import { theme as design } from '../../styles/theme';
import EarningsView from './EarningsView';
import { RupeeIcon } from '../common/FinanceIcons';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onBack: () => void;
}

/** Desktop Manage Earnings: page header + the same banking-style view as the phone. */
const EarningsHistoryPage: React.FC<Props> = ({ onBack }) => {
  const { t } = useLanguage();
  return (
    <div style={{ minHeight: '100vh', padding: '10px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-card page-head animate-in">
          <span className="page-head-ico" style={{ background: design.colors.primaryGradient }}>
            <RupeeIcon size={20} color="#fff" strokeWidth={2.3} />
          </span>
          <div className="page-head-text">
            <h1 className="text-gradient">{t('dashboard.nav.earnings')}</h1>
            <p>{t('earnings.page.subtitle')}</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost page-head-back">
            <span aria-hidden="true">←</span>
            <span className="page-head-back-label">{t('dashboard.navSection.dashboard')}</span>
          </button>
        </div>
        <div className="bank-ui lg-wide">
          <EarningsView />
        </div>
      </div>
    </div>
  );
};

export default EarningsHistoryPage;
