import { DIRECTION_UNKNOWN, parseStatementAmount, parseStatementDate } from './normalize';
import { reconcileBalances } from './balanceCheck';
import { extractReferenceNumber } from './referenceNumber';
import type { NormalizedTransaction } from './types';

/** One piece of text from a PDF page, with where it sits on the page
 *  (PDF coordinates: y grows upwards). */
export interface PdfTextItem {
  page: number;
  x: number;
  y: number;
  width: number;
  str: string;
}

interface Line {
  page: number;
  y: number;
  items: PdfTextItem[];
  text: string;
}

/** Horizontal centres of the statement's amount columns. */
interface Columns {
  debit: number;
  credit: number;
  balance: number | null;
}

interface Pending {
  tx: NormalizedTransaction;
  title: string;
  inline: string;
  parts: string[];
  /** Direction could not be read from a column and must come from the balance. */
  needsDirection: boolean;
}

const DATE_AT_START = /^(?:\d+\s+)?(\d{1,2}[./-][A-Za-z0-9]{2,4}[./-]\d{2,4})\s*(.*)$/;
const DATE_ANYWHERE = /\d{1,2}[./-][A-Za-z0-9]{2,4}[./-]\d{2,4}/g;
const AMOUNT_TOKEN = /(?:₹|Rs\.?)?\s?[\d,]+\.\d{2}(?!\d)/g;
const BALANCE_SNAPSHOT = /opening balance|closing balance|carried forward|brought forward/i;
const OPENING_SNAPSHOT = /opening balance|brought forward/i;
// A Dr/Cr marker printed right after an amount: "450.00 Dr", "450.00(Cr)".
const MARK_AFTER_AMOUNT = /^\s*\(?\s*(dr|cr)\b/i;
const HEADER_NOISE = /\(INR\)|cheque number|transaction remarks|^s\s*no\.?$|^withdrawal$|^deposit$|^balance$|^date$|^transaction$|^amount$/i;
const DEBIT_HEADING = /withdrawals?|debits?|\bdr\b/i;
const CREDIT_HEADING = /deposits?|credits?|\bcr\b/i;
const BALANCE_HEADING = /balance/i;

const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** Narration text with the amounts removed but every date kept. Dates are
 *  shielded first: "10.06" inside "10.06.2026" would otherwise be taken for
 *  an amount, and a narration's own dates ("INT.PD:01-08-2026 TO
 *  31-10-2026") are part of what the bank printed. */
function narrationText(text: string): string {
  const dates: string[] = [];
  const shielded = text.replace(DATE_ANYWHERE, (m) => {
    dates.push(m);
    return `\uE000${dates.length - 1}\uE000`;
  });
  return shielded
    .replace(AMOUNT_TOKEN, ' ')
    .replace(/\uE000(\d+)\uE000/g, (_, i: string) => dates[Number(i)])
    .replace(/\s+/g, ' ')
    .trim();
}

function groupLines(items: PdfTextItem[]): Line[] {
  const byKey = new Map<string, Line>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.y);
    const key = `${item.page}:${y}`;
    const line = byKey.get(key) ?? { page: item.page, y, items: [], text: '' };
    line.items.push(item);
    byKey.set(key, line);
  }
  const lines = Array.from(byKey.values()).sort((a, b) => a.page - b.page || b.y - a.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  }
  return lines;
}

function lineDate(text: string): { date: Date; rest: string } | null {
  const match = text.match(DATE_AT_START);
  if (!match) return null;
  const date = parseStatementDate(match[1]);
  return date ? { date, rest: match[2] } : null;
}

/** Centre of the part of an item that `start..start+length` covers, assuming
 *  evenly spaced characters — close enough to tell columns apart. */
function spanCentre(item: PdfTextItem, start: number, length: number): number {
  const perChar = item.str.length > 0 ? item.width / item.str.length : 0;
  return item.x + perChar * (start + length / 2);
}

function headingCentre(line: Line, heading: RegExp): number | null {
  for (const item of line.items) {
    const match = heading.exec(item.str);
    if (match) return spanCentre(item, match.index, match[0].length);
  }
  return null;
}

function detectColumns(line: Line): Columns | null {
  if (lineDate(line.text) || line.text.search(AMOUNT_TOKEN) !== -1) return null;
  const debit = headingCentre(line, DEBIT_HEADING);
  const credit = headingCentre(line, CREDIT_HEADING);
  if (debit === null || credit === null || near(debit, credit)) return null;
  return { debit, credit, balance: headingCentre(line, BALANCE_HEADING) };
}

interface LineAmount {
  value: number;
  centre: number;
  /** The bank's own Dr/Cr marker for this amount, when printed. */
  mark: 'debit' | 'credit' | null;
}

function amountsOnLine(line: Line): LineAmount[] {
  const found: LineAmount[] = [];
  for (let i = 0; i < line.items.length; i++) {
    const item = line.items[i];
    // Blank out dates first: "10.06" inside "10.06.2026" looks like an amount.
    const masked = item.str.replace(DATE_ANYWHERE, (m) => ' '.repeat(m.length));
    for (const match of masked.matchAll(AMOUNT_TOKEN)) {
      const value = parseStatementAmount(match[0]);
      if (value === null) continue;
      // The marker follows the amount, in the same text run or the next one.
      const after = masked.slice(match.index + match[0].length);
      // A separate run only counts when it is nothing but the marker — a
      // narration that happens to start with "Dr" is not one.
      const marker = after.trim()
        ? after.match(MARK_AFTER_AMOUNT)
        : (line.items[i + 1]?.str ?? '').match(/^\s*\(?\s*(dr|cr)\.?\s*\)?\s*$/i);
      const mark = marker ? (marker[1].toLowerCase() === 'dr' ? 'debit' : 'credit') : null;
      found.push({ value, centre: spanCentre(item, match.index, match[0].length), mark });
    }
  }
  return found;
}

function readAmounts(
  line: Line,
  columns: Columns | null
): Pick<NormalizedTransaction, 'type' | 'amount' | 'balance' | 'parseIssue'> & { needsDirection: boolean } {
  const amounts = amountsOnLine(line);

  if (columns) {
    const slots: Record<'debit' | 'credit' | 'balance', number[]> = { debit: [], credit: [], balance: [] };
    for (const { value, centre } of amounts) {
      let best: 'debit' | 'credit' | 'balance' = 'debit';
      let bestDistance = Math.abs(centre - columns.debit);
      if (Math.abs(centre - columns.credit) < bestDistance) {
        best = 'credit';
        bestDistance = Math.abs(centre - columns.credit);
      }
      if (columns.balance !== null && Math.abs(centre - columns.balance) < bestDistance) best = 'balance';
      slots[best].push(value);
    }
    if (slots.debit.length <= 1 && slots.credit.length <= 1 && slots.balance.length <= 1) {
      const debit = slots.debit[0] ?? 0;
      const credit = slots.credit[0] ?? 0;
      const balance = slots.balance[0] ?? null;
      if (debit > 0 && credit === 0) return { type: 'debit', amount: debit, balance, parseIssue: null, needsDirection: false };
      if (credit > 0 && debit === 0) return { type: 'credit', amount: credit, balance, parseIssue: null, needsDirection: false };
    }
  }

  const values = amounts.map((a) => a.value);
  if (values.length >= 3) {
    const [debit, credit, balance] = values.slice(-3);
    if (debit > 0 && credit === 0) return { type: 'debit', amount: debit, balance, parseIssue: null, needsDirection: false };
    if (credit > 0 && debit === 0) return { type: 'credit', amount: credit, balance, parseIssue: null, needsDirection: false };
    return { type: null, amount: null, balance, parseIssue: 'Both withdrawal and deposit have values on this row — needs manual review', needsDirection: false };
  }
  // A single amount column: the bank's Dr/Cr marker beside the amount
  // decides; without one the running balance has to (see reconcileBalances).
  if (values.length === 2 || values.length === 1) {
    const balance = values.length === 2 ? values[1] : null;
    const mark = amounts[0].mark;
    if (mark) return { type: mark, amount: values[0], balance, parseIssue: null, needsDirection: false };
    return { type: null, amount: values[0], balance, parseIssue: DIRECTION_UNKNOWN, needsDirection: true };
  }
  return { type: null, amount: null, balance: null, parseIssue: "Couldn't find an amount for this transaction line", needsDirection: false };
}

function typicalLineGap(lines: Line[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page) gaps.push(lines[i - 1].y - lines[i].y);
  }
  if (gaps.length === 0) return 12;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Reads a text-based PDF statement the way the bank printed it: the
 * Withdrawal / Deposit / Balance column an amount sits under decides what it
 * is, and the running balance is used to double-check every row.
 */
export function itemsToTransactions(items: PdfTextItem[]): NormalizedTransaction[] {
  const lines = groupLines(items);
  const maxGap = typicalLineGap(lines) * 2.2;
  const pending: Pending[] = [];
  let columns: Columns | null = null;
  let current: Pending | null = null;
  let title = '';
  let openingBalance: number | null = null;
  const noteOpening = (line: Line) => {
    if (openingBalance !== null || pending.length > 0 || !OPENING_SNAPSHOT.test(line.text)) return;
    const amounts = amountsOnLine(line);
    if (amounts.length > 0) openingBalance = amounts[amounts.length - 1].value;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = i > 0 && lines[i - 1].page === line.page ? lines[i - 1] : null;
    const next = i + 1 < lines.length && lines[i + 1].page === line.page ? lines[i + 1] : null;
    if (!prev) current = null;

    const header = detectColumns(line);
    if (header) {
      columns = header;
      current = null;
      continue;
    }

    const dated = lineDate(line.text);
    // A dated line that carries no amount is wrapped narration, not a new
    // transaction — e.g. the second line of "INT.PD: TO" whose period reads
    // "01-08-2026 TO 31-10-2026". Its date is text, never a transaction date.
    if (dated && current && prev && prev.y - line.y <= maxGap && amountsOnLine(line).length === 0 && !BALANCE_SNAPSHOT.test(dated.rest)) {
      current.parts.push(line.text);
      continue;
    }
    if (dated) {
      if (BALANCE_SNAPSHOT.test(dated.rest)) {
        noteOpening(line);
        current = null;
        title = '';
        continue;
      }
      const { needsDirection, ...amounts } = readAmounts(line, columns);
      current = {
        tx: { date: dated.date, valueDate: null, narration: '', referenceNumber: null, ...amounts },
        title,
        inline: narrationText(dated.rest),
        parts: [],
        needsDirection,
      };
      pending.push(current);
      title = '';
      continue;
    }

    if (HEADER_NOISE.test(line.text) || /^\d{1,3}$/.test(line.text)) continue;

    // An undated "Opening balance" / "Closing balance" line is a snapshot,
    // not part of the transaction above it.
    if (BALANCE_SNAPSHOT.test(line.text)) {
      noteOpening(line);
      current = null;
      title = '';
      continue;
    }

    const gapAbove = prev ? prev.y - line.y : Infinity;
    const gapBelow = next ? line.y - next.y : Infinity;
    // Some banks print a bold title on its own line just above the dated
    // row. It sits closer to the row below it than to the text above it.
    if (next && lineDate(next.text) && gapBelow <= maxGap && (!current || gapBelow < gapAbove - 0.5)) {
      title = line.text;
      continue;
    }
    if (current && gapAbove <= maxGap) current.parts.push(line.text);
    else current = null; // a large gap means the table ended (page footer, sign-off)
  }

  for (const p of pending) {
    const body = [p.inline, ...p.parts].filter(Boolean).join(' ');
    const ownTitle = p.title && !body.toLowerCase().includes(p.title.toLowerCase()) ? p.title : '';
    const narration = [ownTitle, body].filter(Boolean).join(' ');
    p.tx.narration = narration || '(no description)';
    p.tx.referenceNumber = extractReferenceNumber(narration);
  }

  // Statements printed newest-first are flipped so the balance check and the
  // stored order both run oldest-first.
  const first = pending[0]?.tx.date;
  const last = pending[pending.length - 1]?.tx.date;
  const newestFirst = !!first && !!last && first.getTime() > last.getTime();
  if (newestFirst) pending.reverse();

  reconcileBalances(
    pending.map((p) => p.tx),
    new Set(pending.filter((p) => p.needsDirection).map((p) => p.tx)),
    // A newest-first statement prints its opening line last; it is not the
    // balance before the first row in that case, so it isn't used.
    { openingBalance: newestFirst ? null : openingBalance, flagMismatches: true }
  );
  return pending.map((p) => p.tx);
}
