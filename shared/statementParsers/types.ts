// Shared types for the bank statement import pipeline:
// parse -> normalize -> classify -> dedupe -> review -> import.

/** Canonical fields a row maps to, once headers/columns are identified. */
export interface MappedRow {
  date?: string;
  valueDate?: string;
  narration?: string;
  referenceNumber?: string;
  debit?: string;
  credit?: string;
  balance?: string;
}

export type TransactionType = 'debit' | 'credit';

/** A transaction after date/amount normalization, before classification. */
export interface NormalizedTransaction {
  date: Date | null;
  valueDate: Date | null;
  narration: string;
  referenceNumber: string | null;
  type: TransactionType | null;
  amount: number | null;
  balance: number | null;
  /** True when date/amount/type could not be confidently determined. */
  parseIssue: string | null;
}

export type DuplicateConfidence = 'exact' | 'likely' | null;

/** A transaction ready for the review screen — fully classified and flagged. */
export interface ReviewTransaction extends NormalizedTransaction {
  rowId: string;
  category: string;
  description: string;
  isSalaryCandidate: boolean;
  uncertain: boolean;
  duplicateOf: string | null; // existing expense id, if matched
  duplicateConfidence: DuplicateConfidence;
  included: boolean;
}

export interface ParserError {
  code: 'UNSUPPORTED_FORMAT' | 'SCANNED_PDF' | 'ENCRYPTED_PDF' | 'EMPTY_FILE' | 'PARSE_FAILED';
  message: string;
}
