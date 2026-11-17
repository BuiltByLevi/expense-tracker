import * as XLSX from 'xlsx';
import type { NormalizedTransaction, ParserError } from './types';
import { rowsToTransactions } from './columnMapper';
import type { ParseResult } from './csvParser';

/**
 * Platform-independent Excel statement parsing. Takes the raw bytes rather
 * than a browser `File`, so React Native can supply bytes read through
 * expo-file-system and reuse the identical sheet/column-recognition rules.
 */
/**
 * A cell as text the shared normalizer understands, read from the cell's
 * stored VALUE rather than its on-screen formatting. Excel stores a date as
 * a number and shows it in whatever format the workbook picked — commonly
 * US-style "11/3/26" — so reading the displayed text turned 3 Nov into
 * 11 Mar (or failed outright for days after the 12th). Displayed numbers
 * can likewise be rounded ("16" for 15.50) or abbreviated ("4.12E+11" for
 * a reference number).
 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value);
}

export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array): ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    return { error: { code: 'PARSE_FAILED', message: 'Failed to read this Excel file. It may be corrupted or password-protected.' } };
  }

  // Try each sheet in order, use the first one whose columns we recognize.
  // header: 1 gives raw array-of-arrays rows — bank exports (especially
  // "OpTransactionHistory"-style .xls files) often have 10-20 preamble rows
  // (account name, search filters, report title) before the real header row,
  // which rowsToTransactions scans for rather than assuming row 1.
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
    if (rawRows.length === 0) continue;
    const rows = rawRows.map((row) => row.map(cellText));
    const { transactions, columnsRecognized, ...stats } = rowsToTransactions(rows);
    if (columnsRecognized) {
      return { transactions, stats };
    }
  }

  return {
    error: {
      code: 'PARSE_FAILED',
      message: "Couldn't recognize this Excel file's columns. Expected a Date column plus a Debit and/or Credit column.",
    },
  };
}

export type { NormalizedTransaction, ParserError };
