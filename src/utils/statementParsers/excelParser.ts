import { parseExcelBuffer } from '../../../shared/statementParsers/excelParser';
import type { ParseResult } from '../../../shared/statementParsers/csvParser';

/** Web adapter: pulls bytes out of a browser File, then defers to the shared parser. */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { error: { code: 'PARSE_FAILED', message: 'Failed to read this Excel file. It may be corrupted or password-protected.' } };
  }
  return parseExcelBuffer(buffer);
}
