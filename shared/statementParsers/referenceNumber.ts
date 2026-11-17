const UPI_REFERENCE = /\/(\d{12,16})(?:\/|$)/;
const TRANSFER_REFERENCE = /\b(?:NEFT|RTGS|IMPS)[-/ ]+([A-Z0-9]{8,22})\b/i;

/** Pulls the bank-assigned reference (UPI RRN, NEFT/RTGS/IMPS UTR) out of a
 *  narration, for statements that have no separate reference column. */
export function extractReferenceNumber(narration: string): string | null {
  const transfer = narration.match(TRANSFER_REFERENCE);
  if (transfer && /\d/.test(transfer[1])) return transfer[1].toUpperCase();
  const upi = narration.match(UPI_REFERENCE);
  return upi ? upi[1] : null;
}

/**
 * A reference column's value, or null when the bank only printed a
 * placeholder. Banks fill the Chq/Ref column with "0000000000000000", "-",
 * "NA" on rows that have no cheque/reference — treating those as real
 * references would make every such row look like the same transaction.
 */
export function cleanReferenceNumber(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const core = value.replace(/[^a-z0-9]/gi, '');
  if (core === '' || /^0+$/.test(core) || /^(na|nil|none|null)$/i.test(core)) return null;
  return value;
}

/** Comparable form of a reference: the same reference printed by two
 *  formats ("0000412345678901" in a CSV column, "412345678901" in a PDF
 *  narration) compares equal. Null for placeholders. */
export function referenceKey(raw: string | null | undefined): string | null {
  const cleaned = cleanReferenceNumber(raw);
  if (!cleaned) return null;
  return cleaned.replace(/[^a-z0-9]/gi, '').replace(/^0+/, '').toUpperCase() || null;
}
