import { describe, it, expect } from 'vitest';
import { parseCsvText } from './csvParser';

/**
 * parseCsvText is the platform-independent entry point introduced so React
 * Native (no `File`/FileReader) can run the same CSV parsing as the web app,
 * which now only adapts a browser File into text before calling this.
 */
describe('parseCsvText — shared CSV entry point', () => {
  const STATEMENT = [
    'Account Statement for 1234567890',
    'Generated on 12-11-2026',
    '',
    'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
    '02/11/2026,NEFT FUND TRANSFER FROM SAVINGS,REF001,,5000.00,5000.00',
    '05/11/2026,UPI/BIGBASKET/GROCERY,REF002,450.00,,4550.00',
    '28/11/2026,NEFT SALARY ACME CORP,REF003,,50000.00,54550.00',
  ].join('\n');

  it('extracts every transaction row and skips the preamble', () => {
    const result = parseCsvText(STATEMENT);
    expect('transactions' in result).toBe(true);
    if (!('transactions' in result)) return;
    expect(result.transactions).toHaveLength(3);
  });

  it('assigns debit/credit strictly from the withdrawal/deposit columns', () => {
    const result = parseCsvText(STATEMENT);
    if (!('transactions' in result)) throw new Error('expected success');
    const [transfer, grocery, salary] = result.transactions;

    expect(transfer.type).toBe('credit');
    expect(transfer.amount).toBe(5000);
    expect(grocery.type).toBe('debit');
    expect(grocery.amount).toBe(450);
    expect(salary.type).toBe('credit');
    expect(salary.amount).toBe(50000);
  });

  it('reports EMPTY_FILE for input with no rows', () => {
    const result = parseCsvText('');
    expect('error' in result && result.error.code).toBe('EMPTY_FILE');
  });

  it('reports PARSE_FAILED when no date/debit/credit columns are recognizable', () => {
    const result = parseCsvText('Alpha,Beta,Gamma\nfoo,bar,baz');
    expect('error' in result && result.error.code).toBe('PARSE_FAILED');
  });
});
