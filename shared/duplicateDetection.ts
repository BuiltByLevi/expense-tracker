import { toPaise } from './money';
import { referenceKey } from './statementParsers/referenceNumber';
import type { NormalizedTransaction } from './statementParsers/types';

/** The subset of Expense/Income shared by both, which is all this needs. */
interface ExistingRecord {
  id: string;
  amount: number;
  date: Date;
  description: string;
  /** The bank's wording, kept when the user renames an imported entry. */
  originalNarration?: string;
  referenceNumber?: string;
}

/** Whole calendar days between two dates, ignoring time of day — imported
 *  rows carry a few seconds' offset to keep the statement's order. */
function calendarDaysApart(a: Date, b: Date): number {
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.abs(dayA - dayB) / (24 * 60 * 60 * 1000);
}

// Words that say how money moved, not who it went to. Two different UPI
// payments share "UPI" and nothing else, so these don't count as evidence
// that two narrations describe the same transaction.
const GENERIC_WORDS = new Set([
  'upi', 'neft', 'imps', 'rtgs', 'pos', 'ach', 'ecs', 'nach', 'atm', 'dr', 'cr', 'to', 'from', 'by', 'the',
  'payment', 'paid', 'transfer', 'txn', 'ref', 'no', 'bank', 'debit', 'credit', 'p2a', 'p2m', 'p2p',
]);

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Rough text-similarity check: fraction of the shorter description's words
 *  found in the longer one. Good enough to flag likely matches, not exact
 *  equality. Splits on any non-alphanumeric run (not just whitespace) since
 *  UPI/NEFT narrations mix separators inconsistently between a stored
 *  description and a freshly re-parsed one — "UPI-SWIGGY-998877-PAID" and
 *  "UPI SWIGGY ORDER998877" should tokenize comparably. Generic rail words
 *  are ignored unless a narration consists of nothing else. */
function descriptionsAreSimilar(a: string, b: string): boolean {
  let wordsA = words(a);
  let wordsB = words(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const specificA = wordsA.filter((w) => !GENERIC_WORDS.has(w));
  const specificB = wordsB.filter((w) => !GENERIC_WORDS.has(w));
  if (specificA.length > 0 && specificB.length > 0) {
    wordsA = specificA;
    wordsB = specificB;
  }
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  const longerSet = new Set(longer);
  const overlap = shorter.filter((w) => longerSet.has(w)).length;
  return overlap / shorter.length >= 0.5;
}

export interface DuplicateMatch {
  duplicateOf: string;
  confidence: 'exact' | 'likely';
}

export interface DuplicateOptions {
  /** Existing records already matched to another row of this statement. One
   *  stored record can only be "the same transaction" as one statement row —
   *  otherwise two genuine same-day payments would both be flagged against a
   *  single earlier record and both left out. */
  exclude?: ReadonlySet<string>;
  /** Only report bank-reference ('exact') matches. */
  exactOnly?: boolean;
}

/**
 * Checks a parsed transaction (debit or credit) against the user's existing
 * expenses or income. Only ever flags — never auto-excludes — so the user
 * makes the final call in the review screen.
 */
export function findDuplicate(
  transaction: NormalizedTransaction,
  existingRecords: ExistingRecord[],
  referenceNumber: string | null,
  options: DuplicateOptions = {}
): DuplicateMatch | null {
  if (!transaction.date || transaction.amount === null) return null;
  const reference = referenceKey(referenceNumber);
  const amount = toPaise(transaction.amount);

  // Scans every record before deciding — an early return on the first
  // amount+date coincidence could lock in a weak 'likely' match (which
  // un-checks the row for import by default) while a genuinely exact match
  // for the same transaction sits later in the array and never gets seen.
  let bestMatch: DuplicateMatch | null = null;
  let bestStrength = 0; // higher = more confident, among non-'exact' candidates

  for (const record of existingRecords) {
    if (options.exclude?.has(record.id)) continue;
    const sameAmount = toPaise(record.amount) === amount;
    const recordReference = referenceKey(record.referenceNumber);

    if (reference && recordReference) {
      // Both sides carry a real bank-assigned reference (UTR/UPI ref/cheque
      // no.) — the strongest signal available, and it cuts both ways: equal
      // means the same transaction; different means certainly NOT the same
      // transaction, even if amount/date/description happen to coincide
      // (e.g. two UPI payments to the same biller on the same day). Don't
      // fall through to the weaker heuristics below in that case.
      //
      // The amount must agree too: a bank can print one reference on two
      // legs (a charge and its GST, a mandate id on every instalment), and
      // those are separate transactions. Short references (cheque numbers)
      // get reused over the years, so they must also be close in date.
      if (recordReference === reference && sameAmount) {
        const longReference = reference.length >= 8;
        if (longReference || calendarDaysApart(record.date, transaction.date) <= 3) {
          return { duplicateOf: record.id, confidence: 'exact' };
        }
      }
      continue;
    }

    if (options.exactOnly || !sameAmount) continue;

    const dayDelta = calendarDaysApart(record.date, transaction.date);
    if (dayDelta > 1) continue;

    // No reference number on either side to corroborate, so amount+date
    // alone is NOT enough to flag a match — a round amount (₹100 lunch, ₹20
    // bus fare, ₹1000 EMI, ...) recurs constantly across unrelated
    // transactions, and flagging every coincidence as a "possible duplicate"
    // silently defaults real, distinct rows to unchecked on import (this is
    // exactly what happened importing a real statement: ~all of its debits
    // collided by amount+date with pre-existing unrelated expenses and were
    // excluded by default). Text similarity is required to corroborate the
    // amount+date match; it's never promoted to 'exact' no matter how high
    // the overlap, since two genuinely distinct transactions (two ATM
    // withdrawals whose narration differs only by a branch code) can score
    // just as high as a true re-import.
    const similar =
      descriptionsAreSimilar(record.description, transaction.narration) ||
      (!!record.originalNarration && descriptionsAreSimilar(record.originalNarration, transaction.narration));
    if (!similar) continue;

    const strength = dayDelta === 0 ? 2 : 1;
    if (strength > bestStrength) {
      bestMatch = { duplicateOf: record.id, confidence: 'likely' };
      bestStrength = strength;
    }
  }

  return bestMatch;
}
