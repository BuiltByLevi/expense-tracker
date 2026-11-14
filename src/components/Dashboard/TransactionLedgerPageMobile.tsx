import React from 'react';
import LedgerView from './LedgerView';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
}

const TransactionLedgerPageMobile: React.FC<Props> = () => (
  <div className="m-content">
    <LedgerView />
  </div>
);

export default TransactionLedgerPageMobile;
