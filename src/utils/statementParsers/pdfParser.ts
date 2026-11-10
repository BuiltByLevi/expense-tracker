import * as pdfjsLib from 'pdfjs-dist';
// Vite ?url import bundles the worker as a same-origin asset, satisfying the
// app's strict `script-src 'self'` CSP (no CDN worker loading).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { parseStatementAmount, parseStatementDate } from './normalize';
import type { NormalizedTransaction, ParserError } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

// Matches a date at the start of a line, with an optional leading serial
// number ("1 02.03.2026 60.00 36094.63"), and dot/slash/dash date separators
// (ICICI-style exports use "." — e.g. "02.03.2026").
const DATE_WITH_OPTIONAL_SERIAL = /^(?:\d+\s+)?(\d{1,2}[./-][A-Za-z0-9]{2,4}[./-]\d{2,4})\s*(.*)$/;
const AMOUNT_TOKEN = /(?:₹|Rs\.?)?\s?[\d,]+\.\d{2}\b/g;
const BALANCE_SNAPSHOT_KEYWORDS = /opening balance|closing balance|carried forward|brought forward/i;
// Repeating per-page column headers and bare page numbers — noise that
// shouldn't be appended as narration when it shows up between transactions
// (these don't have a date, so without filtering they'd attach to whatever
// transaction came right before a page break).
const HEADER_NOISE = /\(INR\)|cheque number|transaction remarks|^s\s*no\.?$|^withdrawal$|^deposit$|^balance$|^date$|^transaction$|^amount$/i;

function isNoiseLine(line: string): boolean {
  return HEADER_NOISE.test(line) || /^\d{1,3}$/.test(line);
}

async function extractLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items into lines by rounded y-position, then order left-to-right by x.
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const bucket = rows.get(y) ?? [];
      bucket.push({ x, str: item.str });
      rows.set(y, bucket);
    }

    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a); // top to bottom
    for (const y of sortedYs) {
      const items = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}

/** Infers debit/credit direction from the running-balance delta when the
 *  line doesn't clearly expose separate debit/credit columns. This is a
 *  weaker signal than a real column split, so callers must flag it uncertain. */
function inferDirectionFromBalance(balance: number | null, previousBalance: number | null): 'debit' | 'credit' | null {
  if (balance === null || previousBalance === null) return null;
  if (balance > previousBalance) return 'credit';
  if (balance < previousBalance) return 'debit';
  return null;
}

interface PendingTransaction {
  date: Date;
  /** Text remaining on the date line itself, after the date — usually just amounts, but
   *  some bank layouts put narration inline here too. */
  rest: string;
  /** Narration that wraps onto its own line(s) below the date line (common — long
   *  UPI/NEFT descriptions rarely fit on one line in a PDF table). */
  narrationParts: string[];
}

function finalizeTransaction(pending: PendingTransaction, previousBalance: number | null): NormalizedTransaction {
  const amountTokens = Array.from(pending.rest.matchAll(AMOUNT_TOKEN)).map((m) => m[0]);
  const amounts = amountTokens.map((t) => parseStatementAmount(t)).filter((n): n is number => n !== null);
  const restNarration = pending.rest.replace(AMOUNT_TOKEN, '').replace(/\s{2,}/g, ' ').trim();
  const narration = [restNarration, ...pending.narrationParts].filter(Boolean).join(' ');

  let type: 'debit' | 'credit' | null = null;
  let amount: number | null = null;
  let balance: number | null = null;
  let parseIssue: string | null = null;

  if (amounts.length >= 3) {
    // Likely debit, credit, balance columns all printed (one of debit/credit ~0).
    const [debit, credit, bal] = amounts.slice(-3);
    balance = bal;
    if (debit > 0 && credit === 0) {
      type = 'debit';
      amount = debit;
    } else if (credit > 0 && debit === 0) {
      type = 'credit';
      amount = credit;
    } else {
      parseIssue = 'Ambiguous debit/credit columns in PDF line — needs manual review';
    }
  } else if (amounts.length === 2) {
    // One transaction amount + running balance — direction inferred from balance delta.
    [amount, balance] = amounts;
    type = inferDirectionFromBalance(balance, previousBalance);
    parseIssue = 'Debit/credit direction inferred from balance change — please verify';
  } else if (amounts.length === 1) {
    // A single number with no balance to disambiguate against.
    [amount] = amounts;
    parseIssue = 'Could not confirm debit/credit direction from this PDF line — please verify';
  } else {
    parseIssue = "Couldn't find an amount for this transaction line";
  }

  return {
    date: pending.date,
    valueDate: null,
    narration: narration || '(no description)',
    referenceNumber: null,
    type,
    amount,
    balance,
    parseIssue,
  };
}

export async function parsePdfFile(file: File): Promise<
  { transactions: NormalizedTransaction[] } | { error: ParserError }
> {
  let lines: string[];
  try {
    lines = await extractLines(file);
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === 'PasswordException') {
      return { error: { code: 'ENCRYPTED_PDF', message: 'This PDF is password-protected. Please remove the password and re-upload.' } };
    }
    return { error: { code: 'PARSE_FAILED', message: 'Failed to read this PDF file.' } };
  }

  const totalText = lines.join('').trim();
  if (totalText.length < 20) {
    return {
      error: {
        code: 'SCANNED_PDF',
        message: "This looks like a scanned/image PDF with no extractable text. Scanned statements aren't supported yet — try CSV or Excel instead, or a text-based PDF.",
      },
    };
  }

  const transactions: NormalizedTransaction[] = [];
  let previousBalance: number | null = null;
  let current: PendingTransaction | null = null;

  const finalizeCurrent = () => {
    if (!current) return;
    const tx = finalizeTransaction(current, previousBalance);
    transactions.push(tx);
    if (tx.balance !== null) previousBalance = tx.balance;
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_WITH_OPTIONAL_SERIAL);
    const date = dateMatch ? parseStatementDate(dateMatch[1]) : null;

    if (date) {
      if (BALANCE_SNAPSHOT_KEYWORDS.test(dateMatch![2])) {
        // Opening/closing balance line — not a transaction, but still closes out
        // whatever transaction was accumulating before it.
        finalizeCurrent();
        continue;
      }
      finalizeCurrent();
      current = { date, rest: dateMatch![2], narrationParts: [] };
      continue;
    }

    if (isNoiseLine(line)) continue;
    if (current) current.narrationParts.push(line);
    // Lines before the first dated line (headers, address block) are naturally dropped.
  }
  finalizeCurrent();

  if (transactions.length === 0) {
    return {
      error: {
        code: 'PARSE_FAILED',
        message: "Couldn't find any recognizable transaction lines in this PDF. It may use a layout this app doesn't understand yet — try CSV or Excel instead.",
      },
    };
  }

  return { transactions };
}
