import { describe, expect, it } from 'vitest';
import { auditTransferRecords, classifyTransferRecord, type AuditRecord } from './transferAudit';

const rec = (over: Partial<AuditRecord>): AuditRecord => ({
  id: 'x', amount: 100, category: 'Transfers', date: '2026-11-05', source: 'import', originalNarration: '', ...over,
});

describe('classifying imported Transfers records', () => {
  it.each([
    ['IMPS/633212345004/SELF TRANSFER TO SAVINGS', 'internal'],
    ['FUND TRANSFER TO OWN ACCOUNT 1234', 'internal'],
    ['NEFT-N322260000777777-SUNRISE ENTERPRISES', 'external'],
    ['RTGS-UTIBR52026111200001-BUILDER RAMESH', 'external'],
    ['IMPS/631012345678/TO JOHN', 'ambiguous'],
    ['NEFT-N322', 'ambiguous'],
    ['TRANSFER TO 1234', 'ambiguous'],
  ])('%s → %s', (narration, group) => {
    expect(classifyTransferRecord(rec({ originalNarration: narration })).group).toBe(group);
  });

  it('a hand-entered Transfers expense is always its own group, never a candidate', () => {
    expect(classifyTransferRecord(rec({ source: undefined, originalNarration: 'SELF TRANSFER' })).group).toBe('manual');
    expect(classifyTransferRecord(rec({ source: 'manual', originalNarration: 'NEFT-X-VENDOR NAME' })).group).toBe('manual');
  });

  it('a counterparty needs two real name words, so a single word stays ambiguous', () => {
    expect(classifyTransferRecord(rec({ originalNarration: 'NEFT-N1-ACME' })).group).toBe('ambiguous');
  });
});

describe('the audit totals', () => {
  const records: AuditRecord[] = [
    rec({ id: 'a', amount: 3500, originalNarration: 'NEFT-N1-SUNRISE ENTERPRISES' }),
    rec({ id: 'b', amount: 5000, originalNarration: 'IMPS/SELF TRANSFER TO SAVINGS' }),
    rec({ id: 'c', amount: 750, originalNarration: 'IMPS/630/TO JOHN' }),
    rec({ id: 'd', amount: 200, source: undefined, originalNarration: 'NEFT TO FRIEND' }),
    rec({ id: 'e', amount: 999, category: 'Groceries', originalNarration: 'NEFT-N1-VENDOR SHOP' }),
  ];

  it('counts and sums each group, and ignores other categories', () => {
    const s = auditTransferRecords(records);
    expect(s.groups.external).toEqual({ count: 1, amount: 3500 });
    expect(s.groups.internal).toEqual({ count: 1, amount: 5000 });
    expect(s.groups.ambiguous).toEqual({ count: 1, amount: 750 });
    expect(s.groups.manual).toEqual({ count: 1, amount: 200 });
    expect(s.total).toEqual({ count: 4, amount: 9450 });
  });

  it('does not modify the records it reads', () => {
    const before = JSON.stringify(records);
    auditTransferRecords(records);
    expect(JSON.stringify(records)).toBe(before);
  });
});
