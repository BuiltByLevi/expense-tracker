import React from 'react';
import EarningsView from './EarningsView';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
}

const EarningsHistoryPageMobile: React.FC<Props> = () => (
  <div className="m-content">
    <EarningsView />
  </div>
);

export default EarningsHistoryPageMobile;
