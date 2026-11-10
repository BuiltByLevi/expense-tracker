import { describe, it, expect } from 'vitest';
import { parseStatementDate, parseStatementAmount } from './normalize';

describe('parseStatementDate', () => {
  it('normalizes to local midnight, deterministically, regardless of when it is called', async () => {
    const a = parseStatementDate('30/11/2026');
    await new Promise((r) => setTimeout(r, 5));
    const b = parseStatementDate('30/11/2026');
    expect(a?.getTime()).toBe(b?.getTime());
    expect(a?.getHours()).toBe(0);
    expect(a?.getMinutes()).toBe(0);
    expect(a?.getSeconds()).toBe(0);
    expect(a?.getMilliseconds()).toBe(0);
  });

  it('preserves the calendar date across supported formats', () => {
    for (const raw of ['30/11/2026', '30-11-2026', '30.11.2026', '2026-11-30']) {
      const d = parseStatementDate(raw);
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10);
      expect(d?.getDate()).toBe(30);
    }
  });

  it('returns null for unparseable input', () => {
    expect(parseStatementDate('not a date')).toBeNull();
    expect(parseStatementDate(undefined)).toBeNull();
  });
});

describe('parseStatementAmount', () => {
  it('strips currency symbols, grouping commas, and Dr/Cr suffixes', () => {
    expect(parseStatementAmount('₹1,23,456.78')).toBe(123456.78);
    expect(parseStatementAmount('1,200.00 Cr')).toBe(1200);
    expect(parseStatementAmount('Rs. 500')).toBe(500);
  });

  it('returns null for empty/invalid input', () => {
    expect(parseStatementAmount('')).toBeNull();
    expect(parseStatementAmount('-')).toBeNull();
    expect(parseStatementAmount(undefined)).toBeNull();
  });
});
