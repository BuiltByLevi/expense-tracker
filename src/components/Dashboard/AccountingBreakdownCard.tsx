import React, { useMemo, useState } from 'react';
import { breakdownForPeriod, type AccountingPeriod, type MonthlyBreakdown } from '../../../shared/accounting';
import { accountingStrings, type AccountingKey } from '../../../shared/i18n/accountingStrings';
import type { Expense, Income } from '../../types';
import { useLanguage } from '../../context/useLanguage';
import { theme as design } from '../../styles/theme';

interface Props {
  expenses: Expense[];
  income: Income[];
  year: number;
  month: number;
  /** The dashboard's own month figures, to flag when they use a manual amount. */
  dashboardEarnings: number;
  dashboardNetCashFlow: number;
}

const SAME = 0.005;
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * The seven accounting figures for the selected month or year. Every number
 * comes from shared/accounting (monthlyBreakdown / breakdownForPeriod) — this
 * component only lays them out. Excluded movements stay visible, labelled.
 */
const AccountingBreakdownCard: React.FC<Props> = ({ expenses, income, year, month, dashboardEarnings, dashboardNetCashFlow }) => {
  const { language } = useLanguage();
  const s = accountingStrings(language);
  const [view, setView] = useState<'month' | 'year'>('month');
  const b: MonthlyBreakdown = useMemo(() => {
    const period: AccountingPeriod = view === 'month' ? { kind: 'month', year, month } : { kind: 'year', year };
    return breakdownForPeriod(expenses, income, period);
  }, [expenses, income, view, year, month]);

  const differs =
    view === 'month' &&
    (Math.abs(b.monthlyEarnings - dashboardEarnings) > SAME || Math.abs(b.netCashFlow - dashboardNetCashFlow) > SAME);

  const row = (label: AccountingKey, value: number, hint: AccountingKey, emphasis = false) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: emphasis ? 700 : 600, color: design.colors.textPrimary }}>{s[label]}</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: design.colors.textSecondary, lineHeight: 1.4 }}>{s[hint]}</p>
      </div>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', color: design.colors.textPrimary }}>{inr(value)}</p>
    </div>
  );

  const heading = (text: string) => (
    <p style={{ margin: '14px 0 2px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: design.colors.primary }}>{text}</p>
  );

  const segment = (key: 'month' | 'year', label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      aria-pressed={view === key}
      style={{
        padding: '4px 12px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '8px',
        background: view === key ? design.colors.primary : 'transparent',
        color: view === key ? 'white' : design.colors.textSecondary,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px' }} aria-label={s.title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: design.colors.textPrimary }}>{s.title}</h3>
        <div role="group" style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)' }}>
          {segment('month', s.monthly)}
          {segment('year', s.yearly)}
        </div>
      </div>

      {heading(s.sectionEarnings)}
      {row('earnings', b.monthlyEarnings, 'earningsHint', true)}
      {row('refunds', b.refunds, 'refundsHint')}
      {row('transfersIn', b.transfersIn, 'transfersInHint')}

      {heading(s.sectionSpending)}
      {row('expenses', b.monthlyExpenses, 'expensesHint', true)}
      {row('netCashFlow', b.netCashFlow, 'netCashFlowHint', true)}

      {heading(s.sectionExcluded)}
      {row('cashWithdrawals', b.cashWithdrawals, 'cashWithdrawalsHint')}
      {row('transfersOut', b.transfersOut, 'transfersOutHint')}
      {row('investments', b.investments, 'investmentsHint')}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: design.colors.textPrimary }}>{s.bankMovement}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: design.colors.textSecondary }}>{s.bankMovementHint}</p>
        </div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary }}>{inr(b.bankNetChange)}</p>
      </div>

      {view === 'year' ? (
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: design.colors.textTertiary }}>{s.yearNote}</p>
      ) : null}
      {differs ? (
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', fontWeight: 600, color: design.colors.warning }}>{s.manualDiffers}</p>
      ) : null}
    </div>
  );
};

export default AccountingBreakdownCard;
