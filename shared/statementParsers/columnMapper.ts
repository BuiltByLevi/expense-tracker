import type { MappedRow, NormalizedTransaction } from './types';
import { detectMonthFirst, normalizeRowDetailed, parseStatementAmount, parseStatementDate } from './normalize';
import { reconcileBalances } from './balanceCheck';

// Header name variants seen across Indian bank statement exports (SBI, HDFC,
// ICICI, Axis, Kotak, BoB, ...). Best-effort — not exhaustive. Matching is
// case-insensitive, ignores non-alphanumeric characters, and for aliases of
// 5+ characters also matches as a substring — so "Withdrawal Amount(INR)",
// "Debit Amt.", "Withdrawal" all resolve to the same field. Short/generic
// aliases (e.g. bare "date") stay exact-only so they don't swallow more
// specific compound headers like "Value Date".
const COLUMN_ALIASES: Record<keyof MappedRow, string[]> = {
  date: ['date', 'txndate', 'trandate', 'transactiondate', 'postingdate', 'posteddate', 'bookingdate'],
  valueDate: ['valuedate', 'valdate', 'valuedt'],
  narration: ['narration', 'description', 'particulars', 'transactionremarks', 'remarks', 'details', 'narrative'],
  referenceNumber: ['refno', 'referenceno', 'refnumber', 'chequerefno', 'chqrefno', 'chequenumber', 'chequeno', 'chqno', 'utr', 'transactionid', 'reference'],
  indicator: ['drcr', 'crdr', 'debitcredit', 'creditdebit', 'depositwithdrawal', 'withdrawaldeposit', 'type', 'txntype', 'trantype', 'transactiontype'],
  debit: ['debit', 'dr', 'withdrawal', 'withdrawalamt', 'debitamount', 'dramount', 'paidout', 'moneyout'],
  credit: ['credit', 'cr', 'deposit', 'depositamt', 'creditamount', 'cramount', 'paidin', 'moneyin'],
  balance: ['balance', 'bal', 'closingbalance', 'availablebalance', 'runningbalance'],
  amount: ['amount', 'amt', 'txnamount', 'transactionamount'],
};

// Order matters: the Dr/Cr marker is checked before debit/credit so a
// "Debit/Credit" header isn't taken for the debit column, and the generic
// single "Amount" comes last so "Debit Amount" / "Balance Amount" win.
const FIELD_ORDER: (keyof MappedRow)[] = ['valueDate', 'date', 'narration', 'referenceNumber', 'indicator', 'debit', 'credit', 'balance', 'amount'];

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
  return fields.has('date') && (fields.has('debit') || fields.has('credit') || fields.has('amount'));
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
    // First column wins when a header repeats (e.g. Kotak prints "Dr / Cr"
    // once for the amount and again for the balance).
    if (field && mapped[field] === undefined && value !== undefined && value !== null && String(value).trim() !== '') {
      mapped[field] = String(value);
    }
  }
  return mapped;
}

// Rows that report a balance or a total rather than a transaction.
const OPENING_ROW = /\b(opening\s*bal(ance)?|brought\s*forward|b\/f)\b/i;
const SUMMARY_ROW = /\b(opening\s*bal(ance)?|closing\s*bal(ance)?|brought\s*forward|carried\s*forward|b\/f|c\/f|(grand|page|sub)?\s*totals?|statement\s*summary|transaction\s*total)\b/i;

function isBlank(row: MappedRow): boolean {
  return !row.date && !row.debit && !row.credit && !row.amount && !row.balance && !row.narration;
}

/** The text of a non-transaction row, wherever the bank put it. */
function rowLabel(row: MappedRow): string {
  return [row.narration, row.date, row.referenceNumber].filter(Boolean).join(' ');
}

interface Prepared {
  rows: MappedRow[];
  openingBalance: number | null;
  /** Rows removed because they are balances/totals/footers, not transactions. */
  nonTransactionRows: number;
}

/**
 * Separates real transaction rows from everything else a bank puts in the
 * table: opening/closing balance lines, total lines, footers — and merges
 * "continuation" rows (extra narration text wrapped onto its own physical
 * row) into the transaction they belong to. Nothing with a usable amount
 * and date is ever removed here.
 */
function prepareRows(rows: MappedRow[]): Prepared {
  const kept: MappedRow[] = [];
  let openingBalance: number | null = null;
  let nonTransactionRows = 0;
  let tableOpen = false; // false after a total/closing line, until the next dated row

  for (const row of rows) {
    if (isBlank(row)) continue;
    const hasDate = parseStatementDate(row.date) !== null || parseStatementDate(row.date, { monthFirst: true }) !== null;
    const hasMovement = parseStatementAmount(row.debit) !== null || parseStatementAmount(row.credit) !== null || parseStatementAmount(row.amount) !== null;
    const label = rowLabel(row);

    // Balance and total lines. A dated row that moves money is always a
    // transaction, whatever its narration says.
    // The one exception is a leading "Opening balance" line, which some banks
    // print with the balance repeated in the deposit column.
    const isOpening = kept.length === 0 && OPENING_ROW.test(label);
    if (isOpening || (SUMMARY_ROW.test(label) && !(hasDate && hasMovement))) {
      if (openingBalance === null && isOpening) {
        openingBalance = parseStatementAmount(row.balance) ?? parseStatementAmount(row.credit) ?? parseStatementAmount(row.amount);
      }
      nonTransactionRows++;
      tableOpen = false;
      continue;
    }

    if (!hasDate && !hasMovement) {
      const balanceOnly = parseStatementAmount(row.balance) !== null;
      // Wrapped narration text belongs to the transaction above it.
      if (!balanceOnly && row.narration && !row.date && tableOpen && kept.length > 0) {
        const prev = kept[kept.length - 1];
        prev.narration = [prev.narration, row.narration].filter(Boolean).join(' ');
        continue;
      }
      // Anything else with no date and no amount is a footer or note.
      nonTransactionRows++;
      continue;
    }

    kept.push(row);
    tableOpen = true;
  }

  return { rows: kept, openingBalance, nonTransactionRows };
}

export interface TabularParseResult {
  transactions: NormalizedTransaction[];
  columnsRecognized: boolean;
  /** Rows after the header that had any content. */
  dataRows: number;
  /** Rows set aside as balances, totals or footers (not transactions). */
  nonTransactionRows: number;
  /** Wrapped-narration rows folded into the transaction above them. */
  continuationRows: number;
}

/** Full header-detect -> map -> clean -> normalize -> balance-check pipeline for tabular (CSV/Excel) rows. */
export function rowsToTransactions(rows: string[][]): TabularParseResult {
  const found = findHeaderRow(rows);
  if (!found) {
    return { transactions: [], columnsRecognized: false, dataRows: 0, nonTransactionRows: 0, continuationRows: 0 };
  }
  const { index, headers, headerMap } = found;
  const mappedRows = rows.slice(index + 1).map((row) => mapArrayRow(row, headers, headerMap)).filter((row) => !isBlank(row));
  const prepared = prepareRows(mappedRows);

  const monthFirst = detectMonthFirst(prepared.rows.map((row) => row.date));
  const signedAmounts = prepared.rows.some((row) => {
    const value = parseStatementAmount(row.amount);
    return value !== null && value < 0;
  });

  const normalized = prepared.rows.map((row) => normalizeRowDetailed(row, { monthFirst, signedAmounts }));
  const transactions = normalized.map((n) => n.transaction);
  const needsDirection = new Set(normalized.filter((n) => n.needsDirection).map((n) => n.transaction));

  // Where the columns couldn't say which way an amount went, the running
  // balance can. The walk has to run oldest-first, and a newest-first export
  // can't always be told apart by its dates (a one-day statement), so both
  // orders are tried and the one that fits the balances is used.
  if (needsDirection.size > 0) {
    const dryRun = (ordered: NormalizedTransaction[]) => {
      const copies = ordered.map((tx) => ({ ...tx }));
      const copyNeeds = new Set(copies.filter((_, i) => needsDirection.has(ordered[i])));
      const mismatches = reconcileBalances(copies, copyNeeds, { openingBalance: prepared.openingBalance });
      return { mismatches, resolved: copies.filter((tx, i) => needsDirection.has(ordered[i]) && tx.type !== null).length };
    };
    const forward = dryRun(transactions);
    const reversed = [...transactions].reverse();
    const backward = dryRun(reversed);
    const useReverse = backward.mismatches < forward.mismatches || (backward.mismatches === forward.mismatches && backward.resolved > forward.resolved);
    reconcileBalances(useReverse ? reversed : transactions, needsDirection, {
      openingBalance: useReverse ? null : prepared.openingBalance,
    });
  }

  return {
    transactions,
    columnsRecognized: true,
    dataRows: mappedRows.length,
    nonTransactionRows: prepared.nonTransactionRows,
    continuationRows: mappedRows.length - prepared.nonTransactionRows - prepared.rows.length,
  };
}
