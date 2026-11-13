import { parseCsvText, type ParseResult } from '../../../shared/statementParsers/csvParser';

/** Web adapter: pulls text out of a browser File, then defers to the shared parser. */
export async function parseCsvFile(file: File): Promise<ParseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: { code: 'PARSE_FAILED', message: 'Failed to read this CSV file.' } };
  }
  return parseCsvText(text);
}
