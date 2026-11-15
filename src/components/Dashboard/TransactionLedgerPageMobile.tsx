import React from 'react';
import LedgerView from './LedgerView';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
  /** The month the Dashboard was showing when navigating here (see LedgerView). */
  year?: number;
  month?: number;
}

const TransactionLedgerPageMobile: React.FC<Props> = ({ year, month }) => (
  <div className="m-content">
    <LedgerView initialYear={year} initialMonth={month} />
  </div>
);

export default TransactionLedgerPageMobile;
