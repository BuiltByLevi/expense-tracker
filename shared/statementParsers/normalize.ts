import { parse, isValid } from 'date-fns';
import { roundMoney } from '../money';
import { cleanReferenceNumber, extractReferenceNumber } from './referenceNumber';
import type { MappedRow, NormalizedTransaction, TransactionType } from './types';

// Date formats seen across Indian bank statements, tried in order.
const DAY_FIRST_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd.MM.yyyy',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'dd/MM/yy',
  'dd-MM-yy',
  'dd.MM.yy',
  'dd MMM yyyy',
  'dd-MMM-yyyy',
  'dd/MMM/yyyy',
  'dd-MMM-yy',
  'dd MMM yy',
  'dd MMMM yyyy',
  'dd-MMMM-yyyy',
  'MMM dd, yyyy',
  'MMMM dd, yyyy',
];
const MONTH_FIRST_FORMATS = ['MM/dd/yyyy', 'MM-dd-yyyy', 'MM/dd/yy', 'MM-dd-yy'];

// "30/11/2026 23:59:58", "2026-11-30T18:45:00Z", "30-11-2026 11:59 PM" — the
// time of day (and any timezone suffix) is dropped and the date is kept
// exactly as the bank printed it, so a late-night row can never slide into
// the next day or month.
const TIME_SUFFIX = /[T\s,]+\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*([AaPp][Mm])?\s*(Z|[+-]\d{2}:?\d{2}|[A-Z]{2,4})?$/;

export interface DateParseOptions {
  /** The file writes dates month-first (11/30/2026) — see detectMonthFirst. */
  monthFirst?: boolean;
}

export function parseStatementDate(raw: string | undefined, options: DateParseOptions = {}): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(TIME_SUFFIX, '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  const formats = options.monthFirst
    ? [...MONTH_FIRST_FORMATS, ...DAY_FIRST_FORMATS]
    : [...DAY_FIRST_FORMATS, ...MONTH_FIRST_FORMATS];
  for (const fmt of formats) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
      // Anchor the printed calendar day at NOON UTC. The date is read from
      // the statement's own y/m/d fields, so it never depends on the device
      // that parsed the file. Local midnight did: an Indian import stored as
      // 31 Oct 18:30Z and read back on a US device showed as 31 Oct — the
      // wrong month. Noon UTC lands on the same calendar day for every
      // viewer from UTC-11 to UTC+11, so the stored date stays put wherever
      // it is viewed. date-fns fills the time fields from the wall clock, so
      // they are overwritten here too: same-day rows compare equal.
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12));
    }
  }
  return null;
}

/**
 * Decides whether a file's numeric dates are month-first (US style). Indian
 * statements are day-first, so that stays the default; a file is only read
 * month-first when it contains a date that cannot be day-first (11/30/2026)
 * and none that cannot be month-first (30/11/2026).
 */
export function detectMonthFirst(rawDates: (string | undefined)[]): boolean {
  let dayFirstEvidence = 0;
  let monthFirstEvidence = 0;
  for (const raw of rawDates) {
    const match = raw?.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{2,4}\b/);
    if (!match) continue;
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first > 12 && second <= 12) dayFirstEvidence++;
    if (second > 12 && first <= 12) monthFirstEvidence++;
  }
  return monthFirstEvidence > 0 && dayFirstEvidence === 0;
}

const NEGATIVE_MARK = /^\(.*\)$|^-|-$|^−/;
const DEBIT_WORD = /^(dr|d|debit|debited|withdrawal|withdrawn|wdl|paid\s*out|out)\.?$/i;
const CREDIT_WORD = /^(cr|c|credit|credited|deposit|deposited|dep|paid\s*in|in)\.?$/i;

/** Reads a debit/credit marker ("DR", "Cr.", "Debit", "(Cr)") — from its own
 *  column or the suffix of an amount cell. Null when there is none. */
export function parseIndicator(raw: string | undefined): TransactionType | null {
  if (!raw) return null;
  const text = raw.trim().replace(/^\(|\)$/g, '');
  if (DEBIT_WORD.test(text)) return 'debit';
  if (CREDIT_WORD.test(text)) return 'credit';
  const suffix = raw.match(/\d\s*\(?\s*(dr|cr)\b\.?\s*\)?\s*$/i);
  if (suffix) return suffix[1].toLowerCase() === 'dr' ? 'debit' : 'credit';
  return null;
}

/**
 * Reads a statement amount exactly: strips currency marks (₹, Rs., INR),
 * Indian digit grouping and Dr/Cr suffixes; "(500.00)", "-500.00" and
 * "500.00-" are negative. Returns a finite number rounded to paise, or null
 * when the cell is not purely an amount (never a best-effort guess).
 */
export function parseStatementAmount(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  let text = String(raw).trim();
  if (!text) return null;
  text = text
    .replace(/₹|(?<![a-z])(Rs\.?|INR)(?![a-z])/gi, '')
    .replace(/\(?\s*(?<![a-z])(Dr|Cr)\b\.?\s*\)?/gi, '')
    .replace(/[,\s]/g, '');
  if (text === '' || text === '-') return null;
  const negative = NEGATIVE_MARK.test(text);
  const digits = text.replace(/^\(|\)$/g, '').replace(/^[-−+]|-$/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(digits)) return null;
  const value = roundMoney(parseFloat(digits));
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export interface NormalizeOptions extends DateParseOptions {
  /** The single Amount column carries signs (some row is negative), so a
   *  plain positive value there can be trusted to be a deposit. */
  signedAmounts?: boolean;
}

export const DIRECTION_UNKNOWN = 'Could not tell whether this is a withdrawal or a deposit — please verify';

/** A normalized row plus whether its direction still has to be worked out
 *  (from the running balance, or by the user in review). */
export interface NormalizedRow {
  transaction: NormalizedTransaction;
  needsDirection: boolean;
}

export function normalizeRowDetailed(row: MappedRow, options: NormalizeOptions = {}): NormalizedRow {
  const date = parseStatementDate(row.date, options);
  const valueDate = parseStatementDate(row.valueDate, options);
  const debit = parseStatementAmount(row.debit);
  const credit = parseStatementAmount(row.credit);
  const single = parseStatementAmount(row.amount);
  const balance = parseStatementAmount(row.balance);
  const narration = (row.narration || '').trim();

  let type: TransactionType | null = null;
  let amount: number | null = null;
  let parseIssue: string | null = null;
  let needsDirection = false;

  const hasDebit = debit !== null && debit !== 0;
  const hasCredit = credit !== null && credit !== 0;

  // The statement's own structure decides debit vs credit — the column the
  // amount sits in, or the bank's Dr/Cr marker. Never the narration.
  if (hasDebit && !hasCredit) {
    type = 'debit';
    amount = Math.abs(debit);
  } else if (hasCredit && !hasDebit) {
    type = 'credit';
    amount = Math.abs(credit);
    if (credit < 0) parseIssue = 'Negative amount in the deposit column — please verify';
  } else if (hasDebit && hasCredit) {
    parseIssue = 'Both debit and credit columns have values — needs manual review';
  } else if (single !== null && single !== 0) {
    amount = Math.abs(single);
    const marked = parseIndicator(row.indicator) ?? parseIndicator(row.amount);
    if (marked) {
      type = marked;
    } else if (single < 0) {
      type = 'debit';
    } else if (options.signedAmounts) {
      type = 'credit';
    } else {
      needsDirection = true;
      parseIssue = DIRECTION_UNKNOWN;
    }
  }

  if (!date) {
    parseIssue = parseIssue || 'Could not parse transaction date';
  }
  if (type === null && !parseIssue) {
    parseIssue = 'Could not determine debit/credit amount';
  }
  if (!narration) {
    parseIssue = parseIssue || 'Missing transaction description';
  }

  return {
    transaction: {
      date,
      valueDate,
      narration: narration || '(no description)',
      referenceNumber: cleanReferenceNumber(row.referenceNumber) ?? extractReferenceNumber(narration),
      type,
      amount,
      balance,
      parseIssue,
    },
    needsDirection,
  };
}

export function normalizeRow(row: MappedRow, options: NormalizeOptions = {}): NormalizedTransaction {
  return normalizeRowDetailed(row, options).transaction;
}
