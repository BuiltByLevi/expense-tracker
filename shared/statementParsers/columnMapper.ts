import type { MappedRow, NormalizedTransaction } from './types';
import { normalizeRow } from './normalize';

// Header name variants seen across Indian bank statement exports (SBI, HDFC,
// ICICI, Axis, Kotak, BoB, ...). Best-effort — not exhaustive. Matching is
// case-insensitive, ignores non-alphanumeric characters, and for aliases of
// 5+ characters also matches as a substring — so "Withdrawal Amount(INR)",
// "Debit Amt.", "Withdrawal" all resolve to the same field. Short/generic
// aliases (e.g. bare "date") stay exact-only so they don't swallow more
// specific compound headers like "Value Date".
const COLUMN_ALIASES: Record<keyof MappedRow, string[]> = {
  date: ['date', 'txndate', 'transactiondate', 'postingdate'],
  valueDate: ['valuedate', 'valdate'],
  narration: ['narration', 'description', 'particulars', 'transactionremarks', 'remarks', 'details'],
  referenceNumber: ['refno', 'referenceno', 'refnumber', 'chequerefno', 'chqrefno', 'chequenumber', 'utr', 'transactionid'],
  debit: ['debit', 'withdrawal', 'withdrawalamt', 'debitamount', 'dramount'],
  credit: ['credit', 'deposit', 'depositamt', 'creditamount', 'cramount'],
  balance: ['balance', 'closingbalance', 'availablebalance', 'runningbalance'],
};

const FIELD_ORDER: (keyof MappedRow)[] = ['valueDate', 'date', 'narration', 'referenceNumber', 'debit', 'credit', 'balance'];

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function aliasMatches(normalizedHeader: string, alias: string): boolean {
  if (normalizedHeader === alias) return true;
  return alias.length >= 5 && normalizedHeader.includes(alias);
}

/** Builds a lookup from header string -> canonical field, for one statement's actual headers. */
export function buildHeaderMap(headers: string[]): Map<string, keyof MappedRow> {
  const map = new Map<string, keyof MappedRow>();
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!normalized) continue;
    for (const field of FIELD_ORDER) {
      if (COLUMN_ALIASES[field].some((alias) => aliasMatches(normalized, alias))) {
        map.set(header, field);
        break;
      }
    }
  }
  return map;
}

/** True once a header set has at least a date and one amount column mapped — enough to attempt parsing. */
export function hasMinimumColumns(headerMap: Map<string, keyof MappedRow>): boolean {
  const fields = new Set(headerMap.values());
  return fields.has('date') && (fields.has('debit') || fields.has('credit'));
}

/**
 * Scans rows for the first one that looks like a real column header (date +
 * at least one amount column recognized). Bank exports — especially the
 * "OpTransactionHistory" style .xls files — often have 10-20 preamble rows
 * (account name, search filters, report title) before the actual header.
 */
export function findHeaderRow(rows: string[][], maxRowsToScan = 50): { index: number; headers: string[]; headerMap: Map<string, keyof MappedRow> } | null {
  const limit = Math.min(rows.length, maxRowsToScan);
  for (let i = 0; i < limit; i++) {
    const headers = rows[i].map((cell) => String(cell ?? '').trim());
    const headerMap = buildHeaderMap(headers);
    if (hasMinimumColumns(headerMap)) {
      return { index: i, headers, headerMap };
    }
  }
  return null;
}

function mapArrayRow(row: string[], headers: string[], headerMap: Map<string, keyof MappedRow>): MappedRow {
  const mapped: MappedRow = {};
  for (let i = 0; i < headers.length; i++) {
    const field = headerMap.get(headers[i]);
    const value = row[i];
    if (field && value !== undefined && value !== '') {
      mapped[field] = String(value);
    }
  }
  return mapped;
}

/**
 * Merges "continuation" rows — rows with no date/debit/credit/balance, only
 * extra narration text — into the previous real transaction row. Common
 * when a bank's export wraps a long narration across multiple physical rows
 * (e.g. the second half of a NEFT/salary description landing in its own row).
 */
function mergeContinuationRows(rows: MappedRow[]): MappedRow[] {
  const merged: MappedRow[] = [];
  for (const row of rows) {
    const isContinuation = !row.date && !row.debit && !row.credit && !row.balance && row.narration;
    if (isContinuation && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.narration = [prev.narration, row.narration].filter(Boolean).join(' ');
      continue;
    }
    if (row.date || row.debit || row.credit || row.balance || row.narration) {
      merged.push(row);
    }
  }
  return merged;
}

/** Full header-detect -> map -> merge-continuations -> normalize pipeline for tabular (CSV/Excel) rows. */
export function rowsToTransactions(rows: string[][]): { transactions: NormalizedTransaction[]; columnsRecognized: boolean } {
  const found = findHeaderRow(rows);
  if (!found) {
    return { transactions: [], columnsRecognized: false };
  }
  const { index, headers, headerMap } = found;
  const mappedRows = rows.slice(index + 1).map((row) => mapArrayRow(row, headers, headerMap));
  const merged = mergeContinuationRows(mappedRows);
  const transactions = merged.map((row) => normalizeRow(row));
  return { transactions, columnsRecognized: true };
}
