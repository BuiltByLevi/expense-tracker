import * as XLSX from 'xlsx';
import type { NormalizedTransaction, ParserError } from './types';
import { rowsToTransactions } from './columnMapper';
import type { ParseResult } from './csvParser';

/**
 * Platform-independent Excel statement parsing. Takes the raw bytes rather
 * than a browser `File`, so React Native can supply bytes read through
 * expo-file-system and reuse the identical sheet/column-recognition rules.
 */
export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array): ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
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
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length === 0) continue;
    const { transactions, columnsRecognized } = rowsToTransactions(rows);
    if (columnsRecognized) {
      return { transactions };
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
