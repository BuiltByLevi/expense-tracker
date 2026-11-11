import { describe, it, expect } from 'vitest';
import { suggestCategory, suggestIncomeCategory, isSalaryCandidate } from './classification';

describe('suggestIncomeCategory — Razorpay narration variations', () => {
  const RAZORPAY_NARRATIONS = [
    'RAZORPAY',
    'RAZORPAY PAYMENTS',
    'RAZORPAY PAYMENTS CREDIT',
    'RAZORPAY SETTLEMENT',
    'RAZORPAY SETTLEMENT UTR123456',
    'RAZORPAY PAYOUT',
    'razorpay payout - ref 998877', // lower-case, as some exports render it
  ];

  for (const narration of RAZORPAY_NARRATIONS) {
    it(`"${narration}" is categorized as income (Other Income, uncertain), never silently dropped or misread as salary/refund/transfer`, () => {
      const { category, uncertain } = suggestIncomeCategory(narration);
      expect(category).toBe('Other Income');
      expect(uncertain).toBe(true);
    });
  }
});

describe('suggestIncomeCategory — Payload narration variations', () => {
  const PAYLOAD_NARRATIONS = [
    'PAYLOAD',
    'PAYLOAD PAYMENT',
    'PAYLOAD SETTLEMENT',
    'PAYLOAD PAYOUT REF998877',
    'payload settlement',
  ];

  for (const narration of PAYLOAD_NARRATIONS) {
    it(`"${narration}" is categorized as income (Other Income, uncertain), never silently dropped`, () => {
      const { category, uncertain } = suggestIncomeCategory(narration);
      expect(category).toBe('Other Income');
      expect(uncertain).toBe(true);
    });
  }

  it('"PAYLOAD" is not accidentally matched by the EMI/Loan pattern via the substring "LOAD" inside "LOAN"', () => {
    // Regression guard: \bLOAN\b is a word-boundary match, so it must not
    // fire on PAYLOAD even though both contain the letters L-O-A-D-adjacent.
    expect(isSalaryCandidate('PAYLOAD SETTLEMENT')).toBe(false);
    const { category } = suggestCategory('PAYLOAD SETTLEMENT');
    expect(category).not.toBe('EMI & Loans');
  });
});

describe('debit/credit indicator always wins over narration', () => {
  it('a Razorpay-named transaction routed through the EXPENSE classifier (as would happen for a gateway fee debit) is never treated as salary income', () => {
    expect(isSalaryCandidate('RAZORPAY PAYMENT GATEWAY FEE')).toBe(false);
    const { category } = suggestCategory('RAZORPAY PAYMENT GATEWAY FEE');
    expect(category).not.toBe('Salary');
  });

  it('a Payload-named debit (e.g. a chargeback/fee) is categorized as a generic expense, not as any income category', () => {
    const { category } = suggestCategory('PAYLOAD CHARGEBACK FEE');
    // suggestCategory only returns ExpenseCategory values — structurally
    // cannot return an IncomeCategory, so this also guards against any
    // future shared-category refactor accidentally blurring the two.
    expect(category).toBe('Other');
  });
});

describe('suggestIncomeCategory — unaffected existing categories still work', () => {
  it('salary narrations are still recognized', () => {
    expect(suggestIncomeCategory('NEFT SALARY ABC TECHNOLOGIES').category).toBe('Salary');
  });
  it('interest narrations are still recognized', () => {
    expect(suggestIncomeCategory('SAVINGS INTEREST CREDITED').category).toBe('Interest');
  });
  it('refund narrations are still recognized', () => {
    expect(suggestIncomeCategory('REFUND ORDER CANCELLED').category).toBe('Refund');
  });
  it('transfer-in narrations are still recognized', () => {
    expect(suggestIncomeCategory('NEFT FUND TRANSFER FROM SAVINGS').category).toBe('Transfer');
  });
});
