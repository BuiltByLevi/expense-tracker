import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { buildTextPdf, excelBuffer, pdfColumnLayout, separateColumnsCsv, signedAmountCsv, singleAmountCsv } from './statementFixture';

/**
 * Regenerates the committed statement files in ./statements from the synthetic
 * FIXTURE. Skipped unless REGENERATE_STATEMENT_FIXTURES=1, so normal test runs
 * never rewrite the fixtures:
 *
 *   REGENERATE_STATEMENT_FIXTURES=1 npx vitest run shared/testFixtures/generateStatementFiles.test.ts
 */
const dir = join(dirname(fileURLToPath(import.meta.url)), 'statements');

describe.skipIf(process.env.REGENERATE_STATEMENT_FIXTURES !== '1')('generate statement fixture files', () => {
  it('writes CSV, XLSX, XLS and PDF statements', () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'november-2026-separate-columns.csv'), separateColumnsCsv());
    writeFileSync(join(dir, 'november-2026-single-amount-drcr.csv'), singleAmountCsv());
    writeFileSync(join(dir, 'november-2026-signed-amount.csv'), signedAmountCsv());
    writeFileSync(join(dir, 'november-2026-bank-export.xlsx'), new Uint8Array(excelBuffer('xlsx')));
    writeFileSync(join(dir, 'november-2026-bank-export.xls'), new Uint8Array(excelBuffer('biff8')));
    writeFileSync(join(dir, 'november-2026-statement.pdf'), buildTextPdf(pdfColumnLayout()));
  });
});
