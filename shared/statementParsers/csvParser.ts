import Papa from 'papaparse';
import type { NormalizedTransaction, ParserError } from './types';
import { rowsToTransactions } from './columnMapper';

export type ParseResult =
  | { transactions: NormalizedTransaction[] }
  | { error: ParserError };

/**
 * Platform-independent CSV statement parsing. Takes the file's text rather
 * than a browser `File` so React Native (which has no `File`/FileReader) can
 * reuse the exact same parsing and column-recognition rules as the web app.
 */
export function parseCsvText(text: string): ParseResult {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.data.length === 0) {
    return { error: { code: 'EMPTY_FILE', message: 'This CSV file has no rows to import.' } };
  }

  const { transactions, columnsRecognized } = rowsToTransactions(result.data);
  if (!columnsRecognized) {
    return {
      error: {
        code: 'PARSE_FAILED',
        message: "Couldn't recognize this CSV's columns. Expected a Date column plus a Debit and/or Credit column.",
      },
    };
  }
  return { transactions };
}
