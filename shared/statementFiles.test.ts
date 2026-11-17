import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Under Node, pdf.js loads its worker from disk instead of a browser URL. Only
// that location is swapped; the parser and pdf.js are the real ones.
vi.mock('pdfjs-dist/legacy/build/pdf.worker.mjs?url', () => ({
  default: new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href,
}));

import { parseCsvText } from './statementParsers/csvParser';
import { parseExcelBuffer } from './statementParsers/excelParser';
import { summarizeStatement } from './statementLedger';
import { EXPECTED, FIXTURE, OPENING_BALANCE } from './testFixtures/statementFixture';
import { parsePdfFile } from '../src/utils/statementParsers/pdfParser';
import type { NormalizedTransaction } from './statementParsers/types';

/**
 * The committed statement files (shared/testFixtures/statements) read back
 * from disk through the production parsers, and checked against the same
 * synthetic FIXTURE every other import test uses.
 */
const dir = join(__dirname, 'testFixtures', 'statements');
const read = (name: string) => readFileSync(join(dir, name));
const bytes = (name: string) => {
  const b = read(name);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

function checkAgainstFixture(transactions: NormalizedTransaction[]) {
  expect(transactions).toHaveLength(EXPECTED.rows);
  expect(transactions.map((t) => [t.type, t.amount])).toEqual(FIXTURE.map((r) => [r.type, r.amount]));
  expect(transactions.map((t) => t.narration)).toEqual(FIXTURE.map((r) => r.narration));
  const summary = summarizeStatement(transactions);
  expect(summary).toMatchObject({
    creditCount: EXPECTED.creditCount,
    debitCount: EXPECTED.debitCount,
    totalCredits: EXPECTED.creditTotal,
    totalDebits: EXPECTED.debitTotal,
    openingBalance: OPENING_BALANCE,
    closingBalance: EXPECTED.closingBalance,
    reconciled: true,
  });
}

const csvText = (name: string) => read(name).toString('utf8');

describe('committed statement files', () => {
  it.each([
    'november-2026-separate-columns.csv',
    'november-2026-single-amount-drcr.csv',
    'november-2026-signed-amount.csv',
  ])('%s parses to the fixture, reconciled', (name) => {
    const result = parseCsvText(csvText(name));
    if ('error' in result) throw new Error(result.error.message);
    checkAgainstFixture(result.transactions);
  });

  it.each(['november-2026-bank-export.xlsx', 'november-2026-bank-export.xls'])('%s parses to the fixture, reconciled', (name) => {
    const result = parseExcelBuffer(bytes(name));
    if ('error' in result) throw new Error(result.error.message);
    checkAgainstFixture(result.transactions);
  });

  it('november-2026-statement.pdf parses to the fixture, reconciled', async () => {
    const file = new File([read('november-2026-statement.pdf')], 'november-2026-statement.pdf', { type: 'application/pdf' });
    const result = await parsePdfFile(file);
    if ('error' in result) throw new Error(result.error.message);
    checkAgainstFixture(result.transactions);
  });
});
