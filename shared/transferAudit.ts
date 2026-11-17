import { sumMoney, roundMoney } from './money';

/**
 * Read-only audit of expenses already saved with the category "Transfers".
 * Before the accounting change, the old classifier filed every NEFT / IMPS /
 * RTGS debit under Transfers — including payments to vendors and people.
 * Transfers are now excluded from Monthly Expenses, so those rows matter.
 * Nothing here changes a record; it only sorts them into groups for review.
 */

export type TransferGroup = 'internal' | 'external' | 'ambiguous' | 'manual';

export interface AuditRecord {
  id: string;
  amount: number;
  category: string;
  date: string;
  /** 'import' | 'manual' | 'recurring' (missing = manual, as stored). */
  source?: string;
  description?: string;
  originalNarration?: string;
}

export interface ClassifiedRecord extends AuditRecord {
  group: TransferGroup;
  reason: string;
}

const INTERNAL = /INTERNAL\s*TRANSFER|SELF\s*TRANSFER|\bOWN\s*(A\/?C|ACCOUNT)\b|\bSWEEP\b/i;
const RAIL = /\b(NEFT|IMPS|RTGS|UPI)\b/i;
const GENERIC = new Set([
  'NEFT', 'IMPS', 'RTGS', 'UPI', 'TRANSFER', 'FUND', 'TO', 'FROM', 'PAYMENT', 'PAID', 'DR', 'CR', 'REF', 'NO', 'BANK', 'TXN', 'ACH',
]);

/** Words that name a counterparty: alphabetic, at least 3 letters, not a rail or generic word. */
function counterpartyWords(narration: string): string[] {
  return narration
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((w) => w.length >= 3 && !GENERIC.has(w));
}

export function classifyTransferRecord(record: AuditRecord): ClassifiedRecord {
  const narration = record.originalNarration || record.description || '';
  if (record.source !== 'import') {
    return { ...record, group: 'manual', reason: 'Entered by hand — never relabelled by this audit' };
  }
  if (INTERNAL.test(narration)) {
    return { ...record, group: 'internal', reason: 'Narration says the money moved between the user\'s own accounts' };
  }
  if (RAIL.test(narration) && counterpartyWords(narration).length >= 2) {
    return { ...record, group: 'external', reason: 'Payment rail with a named counterparty and no internal-transfer wording' };
  }
  return { ...record, group: 'ambiguous', reason: 'No internal-transfer wording and no clear counterparty' };
}

export interface GroupTotal {
  count: number;
  amount: number;
}

export interface TransferAuditSummary {
  total: GroupTotal;
  groups: Record<TransferGroup, GroupTotal>;
  classified: ClassifiedRecord[];
}

/** Records in category Transfers only, grouped and totalled. */
export function auditTransferRecords(records: AuditRecord[]): TransferAuditSummary {
  const transfers = records.filter((r) => r.category === 'Transfers').map(classifyTransferRecord);
  const totalOf = (items: ClassifiedRecord[]): GroupTotal => ({
    count: items.length,
    amount: roundMoney(sumMoney(items.map((i) => i.amount))),
  });
  const groups = {} as Record<TransferGroup, GroupTotal>;
  for (const g of ['internal', 'external', 'ambiguous', 'manual'] as TransferGroup[]) {
    groups[g] = totalOf(transfers.filter((t) => t.group === g));
  }
  return { total: totalOf(transfers), groups, classified: transfers };
}

/** Markdown report: counts and amounts per group, then each record. */
export function renderTransferAuditReport(summary: TransferAuditSummary, sourceLabel: string): string {
  const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines: string[] = [
    '# Transfers audit (read-only)',
    '',
    `Source: ${sourceLabel}. No record was changed, deleted or relabelled.`,
    '',
    '| Group | Records | Amount | Proposed action (needs approval) |',
    '| --- | ---: | ---: | --- |',
    `| Appears internal (own-account wording) | ${summary.groups.internal.count} | ${inr(summary.groups.internal.amount)} | Keep as Transfers (excluded from spending) |`,
    `| Appears external vendor/person payment | ${summary.groups.external.count} | ${inr(summary.groups.external.amount)} | Relabel to Other (counts as spending) |`,
    `| Ambiguous | ${summary.groups.ambiguous.count} | ${inr(summary.groups.ambiguous.amount)} | Review each one; no automatic change |`,
    `| Entered by hand (not imported) | ${summary.groups.manual.count} | ${inr(summary.groups.manual.amount)} | Never changed by this audit |`,
    `| **Total** | **${summary.total.count}** | **${inr(summary.total.amount)}** | |`,
    '',
    '## Records',
    '',
    '| Group | ID | Date | Amount | Narration | Reason |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...summary.classified.map(
      (r) => `| ${r.group} | ${r.id} | ${r.date} | ${inr(r.amount)} | ${(r.originalNarration || r.description || '').replace(/\|/g, '/')} | ${r.reason} |`
    ),
    '',
  ];
  return lines.join('\n');
}
