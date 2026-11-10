import Papa from 'papaparse';
import type { NormalizedTransaction, ParserError } from './types';
import { rowsToTransactions } from './columnMapper';

export function parseCsvFile(file: File): Promise<
  { transactions: NormalizedTransaction[] } | { error: ParserError }
> {
  return new Promise((resolve) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          resolve({ error: { code: 'EMPTY_FILE', message: 'This CSV file has no rows to import.' } });
          return;
        }
        const { transactions, columnsRecognized } = rowsToTransactions(result.data);
        if (!columnsRecognized) {
          resolve({
            error: {
              code: 'PARSE_FAILED',
              message: "Couldn't recognize this CSV's columns. Expected a Date column plus a Debit and/or Credit column.",
            },
          });
          return;
        }
        resolve({ transactions });
      },
      error: () => {
        resolve({ error: { code: 'PARSE_FAILED', message: 'Failed to read this CSV file.' } });
      },
    });
  });
}
