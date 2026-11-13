import { parse, isValid } from 'date-fns';
import type { MappedRow, NormalizedTransaction, TransactionType } from './types';

// Date formats seen across Indian bank statements, tried in order.
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd.MM.yyyy',
  'yyyy-MM-dd',
  'dd/MM/yy',
  'dd-MM-yy',
  'dd.MM.yy',
  'dd MMM yyyy',
  'dd-MMM-yyyy',
  'dd-MMM-yy',
  'MM/dd/yyyy',
];

export function parseStatementDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
      // Normalize to local midnight. date-fns fills any date/time component
      // not present in the format string (i.e. every time-of-day field here)
      // from the reference date — the real wall-clock moment this function
      // was called. Rows parsed moments apart during the same import would
      // otherwise end up with different time-of-day components despite being
      // on the same calendar day, breaking exact-timestamp comparisons
      // elsewhere (e.g. grouping same-day credits for earnings derivation).
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  return null;
}

/** Strips currency symbols, Indian digit grouping, and Dr/Cr suffixes, returns a finite number or null. */
export function parseStatementAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[₹Rr][Ss]?\.?/g, '')
    .replace(/,/g, '')
    .replace(/\b(Dr|Cr)\b/gi, '')
    .trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function normalizeRow(row: MappedRow): NormalizedTransaction {
  const date = parseStatementDate(row.date);
  const valueDate = parseStatementDate(row.valueDate);
  const debit = parseStatementAmount(row.debit);
  const credit = parseStatementAmount(row.credit);
  const balance = parseStatementAmount(row.balance);
  const narration = (row.narration || '').trim();

  let type: TransactionType | null = null;
  let amount: number | null = null;
  let parseIssue: string | null = null;

  // Debit/credit is read from the actual column the amount appeared in —
  // never inferred from the sign of a single combined "amount" column.
  if (debit !== null && debit > 0 && (credit === null || credit === 0)) {
    type = 'debit';
    amount = debit;
  } else if (credit !== null && credit > 0 && (debit === null || debit === 0)) {
    type = 'credit';
    amount = credit;
  } else if (debit !== null && debit > 0 && credit !== null && credit > 0) {
    parseIssue = 'Both debit and credit columns have values — needs manual review';
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
    date,
    valueDate,
    narration: narration || '(no description)',
    referenceNumber: row.referenceNumber?.trim() || null,
    type,
    amount,
    balance,
    parseIssue,
  };
}
