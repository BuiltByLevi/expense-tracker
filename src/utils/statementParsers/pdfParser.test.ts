import { describe, expect, it, vi } from 'vitest';

// Vite's `?url` import resolves to a browser URL. Under Node the worker is
// loaded from disk instead — the only thing swapped here is where pdf.js
// finds its own worker file; the parser and pdf.js themselves are real.
vi.mock('pdfjs-dist/legacy/build/pdf.worker.mjs?url', () => ({
  default: new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href,
}));

import { parsePdfFile } from './pdfParser';
import { summarizeStatement } from '../../../shared/statementLedger';
import { EXPECTED, FIXTURE, OPENING_BALANCE, buildTextPdf, pdfColumnLayout } from '../../../shared/testFixtures/statementFixture';

/**
 * The PDF path from actual bytes: a real text PDF is built, read by pdf.js
 * (the same library the browser uses) and turned into transactions by the
 * production parser — nothing between the file and the result is mocked.
 */
describe('parsePdfFile — real text PDF', () => {
  const file = (bytes: Uint8Array, name = 'statement.pdf') => new File([bytes as BlobPart], name, { type: 'application/pdf' });

  it('reads all 16 transactions of the two-page fixture with exact amounts and directions', async () => {
    const result = await parsePdfFile(file(buildTextPdf(pdfColumnLayout())));
    if ('error' in result) throw new Error(result.error.message);

    expect(result.transactions.map((t) => [t.date?.getDate(), t.type, t.amount])).toEqual(FIXTURE.map((r) => [r.day, r.type, r.amount]));
    expect(result.transactions.filter((t) => t.parseIssue)).toEqual([]);
    expect(summarizeStatement(result.transactions)).toMatchObject({
      creditCount: EXPECTED.creditCount,
      totalCredits: EXPECTED.creditTotal,
      debitCount: EXPECTED.debitCount,
      totalDebits: EXPECTED.debitTotal,
      openingBalance: OPENING_BALANCE,
      closingBalance: EXPECTED.closingBalance,
      reconciled: true,
    });
  });

  it('keeps a narration that wraps onto a second line with its own row', async () => {
    const result = await parsePdfFile(file(buildTextPdf(pdfColumnLayout())));
    if ('error' in result) throw new Error(result.error.message);
    // The fixture wraps at a word boundary, so the two lines rejoin to the exact narration.
    expect(result.transactions[0].narration).toBe(FIXTURE[0].narration);
    expect(result.transactions[0].referenceNumber).toBe('HDFCN52026110100001');
  });

  it('a PDF with no text is reported as scanned, not as an empty statement', async () => {
    const result = await parsePdfFile(file(buildTextPdf([])));
    expect('error' in result && result.error.code).toBe('SCANNED_PDF');
  });

  it('a file that is not a PDF is reported as unreadable', async () => {
    const result = await parsePdfFile(file(new TextEncoder().encode('this is not a pdf')));
    expect('error' in result && result.error.code).toBe('PARSE_FAILED');
  });
});
