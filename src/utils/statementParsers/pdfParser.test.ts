import { describe, it, expect } from 'vitest';
import { linesToTransactions } from './pdfParser';

describe('linesToTransactions', () => {
  it('does not glue the next row\'s bold title line onto the current transaction (ICICI OpTransactionHistory layout)', () => {
    // Real lines (pdf.js text-extraction order) from an ICICI statement: each
    // transaction's bold title ("Credit trxn", "RZPX PVT LTD PAYROLL
    // COMPLIANCE", "Eleven Pun") is its own row ABOVE that transaction's
    // serial+date+amount row, not inline with it.
    const lines = [
      // A preceding transaction, so direction can be inferred from the
      // balance delta (the very first transaction in a statement has no
      // prior balance to compare against).
      'PREMIUM MI',
      '33 29.06.2026 45.00 5250.13',
      'UPI/PREMIUM MI/paytmqr68girx@/Paid via C/YES',
      'Credit trxn',
      '34 30.06.2026 151.00 5401.13',
      '169701520337:Int.Pd:30-03-2026 to 29-06-2026',
      'RZPX PVT LTD PAYROLL COMPLIANCE',
      '35 30.06.2026 34905.00 40306.13',
      'ESCROW ACCOUNT',
      'NEFT-IDFB6181M5999519-RZPX PVT LTD',
      'PAYROLL COMPLIANCE ESCROW ACCOUNT-',
      'SALARY CENTRALOGIC C-101988796',
      'Eleven Pun',
      '36 30.06.2026 30.00 40276.13',
      'UPI/Eleven Pun/25186623099692/Snaks/JIO',
    ];

    const transactions = linesToTransactions(lines);
    expect(transactions).toHaveLength(4);

    const [, interest, salary, snack] = transactions;

    // The interest credit's narration must not absorb the next row's
    // "...PAYROLL COMPLIANCE..." title — that's what flipped its category
    // from Interest to Salary.
    expect(interest.amount).toBe(151);
    expect(interest.type).toBe('credit');
    expect(interest.narration).not.toMatch(/PAYROLL/i);
    expect(interest.narration).toMatch(/Int\.?Pd/i);

    expect(salary.amount).toBe(34905);
    expect(salary.type).toBe('credit');
    expect(salary.narration).toMatch(/PAYROLL/i);
    // Its own narration shouldn't pick up the row after it either.
    expect(salary.narration).not.toMatch(/Eleven Pun/i);

    expect(snack.amount).toBe(30);
    expect(snack.type).toBe('debit');
  });

  it('still attaches genuine multi-line wrapped narration to the right transaction', () => {
    const lines = [
      'PREMIUM MI',
      '1 01.06.2026 70.00 34643.35',
      'UPI/PREMIUM MI/paytmqr68girx@/DAHI AND L/YES',
      'BANK',
      'L/651827240101/YCD391aeab04f544cc7bac9cc4b',
      '876e816d',
      'Bil Payment',
      '2 03.06.2026 4851.00 29792.35',
      'BIL/Consumer Loans XX61053 EMI Pra',
    ];

    const [first, second] = linesToTransactions(lines);
    expect(first.amount).toBe(70);
    expect(first.narration).toMatch(/PREMIUM MI/i);
    expect(first.narration).not.toMatch(/Bil Payment/i);

    expect(second.amount).toBe(4851);
    expect(second.narration).toMatch(/Consumer Loans/i);
  });
});
