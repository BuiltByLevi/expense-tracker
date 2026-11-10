import type { NormalizedTransaction } from './statementParsers/types';

/** The subset of Expense/Income shared by both, which is all this needs. */
interface ExistingRecord {
  id: string;
  amount: number;
  date: Date;
  description: string;
  referenceNumber?: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Rough text-similarity check: fraction of the shorter description's words
 *  found in the longer one. Good enough to flag likely matches, not exact equality. */
function descriptionsAreSimilar(a: string, b: string): boolean {
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wordsB = b.toLowerCase().split(/\s+/).filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  const longerSet = new Set(longer);
  const overlap = shorter.filter((w) => longerSet.has(w)).length;
  return overlap / shorter.length >= 0.5;
}

export interface DuplicateMatch {
  duplicateOf: string;
  confidence: 'exact' | 'likely';
}

/**
 * Checks a parsed transaction (debit or credit) against the user's existing
 * expenses or income. Only ever flags — never auto-excludes — so the user
 * makes the final call in the review screen.
 */
export function findDuplicate(
  transaction: NormalizedTransaction,
  existingRecords: ExistingRecord[],
  referenceNumber: string | null
): DuplicateMatch | null {
  if (!transaction.date || transaction.amount === null) return null;

  // Scans every record before deciding — an early return on the first
  // amount+date coincidence could lock in a weak 'likely' match (which
  // un-checks the row for import by default) while a genuinely exact match
  // for the same transaction sits later in the array and never gets seen.
  let bestMatch: DuplicateMatch | null = null;
  let bestStrength = 0; // higher = more confident, among non-'exact' candidates

  for (const record of existingRecords) {
    if (referenceNumber && record.referenceNumber) {
      // Both sides carry a bank-assigned reference number (UTR/UPI ref/cheque
      // no.) — the strongest signal available, and it cuts both ways: equal
      // means certainly the same transaction; different means certainly NOT
      // the same transaction, even if amount/date/description happen to
      // coincide (e.g. two UPI payments to the same biller on the same day).
      // Don't fall through to the weaker heuristics below in that case.
      if (record.referenceNumber === referenceNumber) {
        return { duplicateOf: record.id, confidence: 'exact' };
      }
      continue;
    }

    const sameAmount = Math.abs(record.amount - transaction.amount) < 0.01;
    if (!sameAmount) continue;

    const dayDelta = Math.abs(record.date.getTime() - transaction.date.getTime());
    if (dayDelta > ONE_DAY_MS) continue;

    // No reference number on either side to corroborate — text similarity
    // alone is never promoted to 'exact', no matter how high the word
    // overlap, because two genuinely distinct transactions (e.g. two ATM
    // withdrawals whose narration differs only by a branch code) can score
    // just as high as a true re-import. Same-day + similar description is
    // still the strongest *likely* signal available, so it wins over a
    // same-amount-but-dissimilar-description candidate found elsewhere in
    // the array, but it's reported with the same hedged confidence.
    const strength = dayDelta === 0 && descriptionsAreSimilar(record.description, transaction.narration) ? 2 : 1;
    if (strength > bestStrength) {
      bestMatch = { duplicateOf: record.id, confidence: 'likely' };
      bestStrength = strength;
    }
  }

  return bestMatch;
}
