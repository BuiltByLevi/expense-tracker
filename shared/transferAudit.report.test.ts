import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { auditTransferRecords, renderTransferAuditReport, type AuditRecord } from './transferAudit';

/**
 * Read-only Transfers audit. Skipped unless both paths are given:
 *
 *   TRANSFER_AUDIT_INPUT=/path/to/expenses.json \
 *   TRANSFER_AUDIT_OUTPUT=/path/to/report.md \
 *   npx vitest run shared/transferAudit.report.test.ts
 *
 * The input is a JSON array of expense records (id, amount, category, date,
 * source, originalNarration/description). It is only read. The only file
 * written is the report at TRANSFER_AUDIT_OUTPUT, which should live outside the repo.
 */
const input = process.env.TRANSFER_AUDIT_INPUT;
const output = process.env.TRANSFER_AUDIT_OUTPUT;

describe.skipIf(!input || !output)('transfers audit report', () => {
  it('writes a report for the given export', () => {
    const records = JSON.parse(readFileSync(input!, 'utf8')) as AuditRecord[];
    if (!Array.isArray(records)) throw new Error('TRANSFER_AUDIT_INPUT must be a JSON array of records');
    const summary = auditTransferRecords(records);
    writeFileSync(output!, renderTransferAuditReport(summary, 'user-supplied export (read-only)'));
  });
});
