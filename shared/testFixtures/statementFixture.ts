import * as XLSX from 'xlsx';
import { commitInChunks, BulkWriteError } from '../bulkWrite';
import { fromTransactionDoc, toTransactionDoc, type TransactionDoc, type TransactionFields } from '../transactionDoc';
import type { PdfTextItem } from '../statementParsers/pdfStatement';
import type { Expense, Income } from '../types';

/**
 * A synthetic one-month statement (November 2026) used across the import
 * regression tests. Entirely made up — no real account data.
 *
 *   8 credits = ₹63,015.50     8 debits = ₹11,149.00     16 rows
 *   earned income (salary + Razorpay + Payload + interest) = ₹57,515.50
 *   spending (ATM ₹2,000 excluded) = ₹9,149.00
 *   opening ₹10,000.00  ->  closing ₹61,866.50
 */
export interface FixtureRow {
  day: number;
  narration: string;
  reference: string;
  type: 'credit' | 'debit';
  amount: number;
  /** What the app is expected to file it under. */
  category: string;
}

export const OPENING_BALANCE = 10000;

export const FIXTURE: FixtureRow[] = [
  { day: 1, narration: 'NEFT-HDFCN52026110100001-ACME TECHNOLOGIES PVT LTD-SALARY NOV', reference: 'HDFCN52026110100001', type: 'credit', amount: 50000, category: 'Salary' },
  { day: 3, narration: 'NEFT-N307260000123456-RAZORPAY SOFTWARE PVT LTD-PAYMENT', reference: 'N307260000123456', type: 'credit', amount: 2500, category: 'Other Income' },
  { day: 5, narration: 'IMPS/630912345678/RAZORPAY SETTLEMENT', reference: '630912345678', type: 'credit', amount: 1250, category: 'Other Income' },
  { day: 7, narration: 'NEFT-N311260000654321-PAYLOAD TECHNOLOGIES-PAYMENT', reference: 'N311260000654321', type: 'credit', amount: 3000, category: 'Other Income' },
  { day: 9, narration: 'PAYLOAD SETTLEMENT 88213', reference: '', type: 'credit', amount: 750, category: 'Other Income' },
  { day: 10, narration: 'UPI/631412345001/BIGBASKET/GROCERY', reference: '631412345001', type: 'debit', amount: 450, category: 'Groceries' },
  { day: 12, narration: 'POS 4567XXXXXXXX1234 AMAZON SHOPPING', reference: '', type: 'debit', amount: 1200, category: 'Shopping' },
  { day: 14, narration: 'BILLPAY-ELECTRICITY BILL MSEDCL', reference: '', type: 'debit', amount: 2000, category: 'Bills & Utilities' },
  { day: 15, narration: 'UPI/631912345002/RAMESH KUMAR/PAYMENT', reference: '631912345002', type: 'debit', amount: 750, category: 'Other' },
  { day: 15, narration: 'ATM WDL 00123 PUNE', reference: '', type: 'debit', amount: 2000, category: 'Cash Withdrawal' },
  { day: 18, narration: 'NEFT-N322260000777777-SUNRISE ENTERPRISES', reference: 'N322260000777777', type: 'debit', amount: 3500, category: 'Other' },
  { day: 20, narration: 'POS 4567XXXXXXXX1234 CITY MEDICO', reference: '', type: 'debit', amount: 950, category: 'Other' },
  { day: 22, narration: 'NETFLIX SUBSCRIPTION', reference: '', type: 'debit', amount: 299, category: 'Entertainment' },
  { day: 25, narration: 'UPI/632912345003/AMAZON REFUND', reference: '632912345003', type: 'credit', amount: 500, category: 'Refund' },
  { day: 28, narration: 'IMPS/633212345004/SELF TRANSFER FROM SAVINGS', reference: '633212345004', type: 'credit', amount: 5000, category: 'Transfer' },
  { day: 30, narration: 'INT.PD:01-08-2026 TO 31-10-2026', reference: '', type: 'credit', amount: 15.5, category: 'Interest' },
];

export const EXPECTED = {
  rows: 16,
  creditCount: 8,
  creditTotal: 63015.5,
  debitCount: 8,
  debitTotal: 11149,
  monthlyEarnings: 57515.5,
  /** Monthly Expenses: spending only. The ₹2,000 ATM withdrawal is a cash
   *  withdrawal, not an expense (see shared/accounting.ts). */
  monthlyExpenses: 9149,
  /** Monthly net cash flow: earnings + refunds − spending (transfers in excluded). */
  netCashFlow: 48866.5,
  /** Bank net movement: every credit − every debit. */
  bankNetChange: 51866.5,
  closingBalance: 61866.5,
};

const pad = (n: number) => String(n).padStart(2, '0');
const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Running balance after each fixture row, in rupees. */
export function balances(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): number[] {
  let paise = Math.round(opening * 100);
  return rows.map((r) => {
    paise += (r.type === 'credit' ? 1 : -1) * Math.round(r.amount * 100);
    return paise / 100;
  });
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const csv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

/** Separate Withdrawal / Deposit columns, with the preamble, opening/closing
 *  balance lines, a totals line and a footer that real exports carry. */
export function separateColumnsCsv(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): string {
  const bal = balances(rows, opening);
  const debits = rows.filter((r) => r.type === 'debit').reduce((s, r) => s + r.amount, 0);
  const credits = rows.filter((r) => r.type === 'credit').reduce((s, r) => s + r.amount, 0);
  return csv([
    ['Account Statement'],
    ['Account No', 'XXXXXXXX1234'],
    [],
    ['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Withdrawal Amt.', 'Deposit Amt.', 'Balance'],
    ['', '', 'Opening Balance', '', '', '', money(opening)],
    ...rows.map((r, i) => [
      `${pad(r.day)}/11/2026`, `${pad(r.day)}/11/2026`, r.narration, r.reference || '0000000000000000',
      r.type === 'debit' ? money(r.amount) : '', r.type === 'credit' ? money(r.amount) : '', money(bal[i]),
    ]),
    ['', '', 'Total', '', money(debits), money(credits), ''],
    ['', '', 'Closing Balance', '', '', '', money(bal[bal.length - 1] ?? opening)],
    ['This is a computer generated statement and does not require a signature.'],
  ]);
}

/** One Amount column plus a Dr/Cr marker column (Kotak-style, including its
 *  repeated "Dr / Cr" header for the balance). */
export function singleAmountCsv(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): string {
  const bal = balances(rows, opening);
  return csv([
    ['Sl. No.', 'Date', 'Description', 'Chq / Ref number', 'Amount', 'Dr / Cr', 'Balance', 'Dr / Cr'],
    ...rows.map((r, i) => [
      String(i + 1), `${pad(r.day)}-11-2026`, r.narration, r.reference, money(r.amount), r.type === 'debit' ? 'DR' : 'CR', money(bal[i]), 'CR',
    ]),
  ]);
}

/** One signed Amount column: withdrawals negative, with a timestamp. */
export function signedAmountCsv(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): string {
  const bal = balances(rows, opening);
  return csv([
    ['Transaction Date', 'Narration', 'Amount (INR)', 'Running Balance'],
    ...rows.map((r, i) => [
      `2026-11-${pad(r.day)} 23:59:5${i % 10}`, r.narration, r.type === 'debit' ? `-${r.amount.toFixed(2)}` : r.amount.toFixed(2), bal[i].toFixed(2),
    ]),
  ]);
}

/** A workbook the way a bank's Excel export is built: real date cells and
 *  real numeric cells, preceded by preamble rows. */
export function excelBuffer(bookType: 'xlsx' | 'biff8', rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): ArrayBuffer {
  const bal = balances(rows, opening);
  const sheet = XLSX.utils.aoa_to_sheet(
    [
      ['Statement of Account'],
      ['Period', '01-Nov-2026 to 30-Nov-2026'],
      [],
      ['Tran Date', 'CHQNO', 'PARTICULARS', 'DR', 'CR', 'BAL'],
      ...rows.map((r, i) => [
        new Date(2026, 10, r.day), r.reference, r.narration,
        r.type === 'debit' ? r.amount : null, r.type === 'credit' ? r.amount : null, bal[i],
      ]),
    ],
    { cellDates: true }
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Statement');
  return XLSX.write(book, { type: 'array', bookType });
}

const CHAR = 4.2;
const left = (page: number, y: number, x: number, str: string): PdfTextItem => ({ page, y, x, str, width: str.length * CHAR });
const right = (page: number, y: number, end: number, str: string): PdfTextItem => ({ page, y, x: end - str.length * CHAR, str, width: str.length * CHAR });

/** Text items of a PDF with Withdrawal / Deposit / Balance columns. */
export function pdfColumnItems(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): PdfTextItem[] {
  const bal = balances(rows, opening);
  const items: PdfTextItem[] = [
    left(1, 760, 25, 'Statement of Account for November 2026'),
    left(1, 720, 61, 'Date'), left(1, 720, 110, 'Transaction Remarks'), left(1, 720, 399, 'Withdrawal'), left(1, 720, 474, 'Deposit'), left(1, 720, 532, 'Balance'),
  ];
  rows.forEach((r, i) => {
    const page = i < 10 ? 1 : 2;
    const y = page === 1 ? 700 - i * 30 : 700 - (i - 10) * 30;
    if (page === 2 && i === 10) {
      items.push(left(2, 720, 61, 'Date'), left(2, 720, 110, 'Transaction Remarks'), left(2, 720, 399, 'Withdrawal'), left(2, 720, 474, 'Deposit'), left(2, 720, 532, 'Balance'));
    }
    items.push(
      left(page, y, 61, `${pad(r.day)}.11.2026`),
      left(page, y, 110, r.narration.slice(0, 40)),
      right(page, y, r.type === 'debit' ? 453 : 519, money(r.amount)),
      right(page, y, 571, money(bal[i]))
    );
    if (r.narration.length > 40) items.push(left(page, y - 10, 110, r.narration.slice(40)));
  });
  return items;
}

/** Text items of a PDF with one Amount column and Dr/Cr markers. */
export function pdfMarkerItems(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): PdfTextItem[] {
  const bal = balances(rows, opening);
  const items: PdfTextItem[] = [left(1, 760, 25, 'Date  Particulars  Amount  Balance'), left(1, 730, 25, `Opening Balance ${money(opening)}`)];
  rows.forEach((r, i) => {
    const y = 700 - i * 20;
    items.push(
      left(1, y, 25, `${pad(r.day)}-11-2026`),
      left(1, y, 90, r.narration),
      right(1, y, 480, `${money(r.amount)} ${r.type === 'debit' ? 'Dr' : 'Cr'}`),
      right(1, y, 571, `${money(bal[i])} Cr`)
    );
  });
  items.push(left(1, 700 - rows.length * 20, 25, `Closing Balance ${money(bal[bal.length - 1])}`));
  return items;
}

/* ------------------------------------------------------------------ */
/* In-memory stand-in for the two Firestore collections.               */
/* ------------------------------------------------------------------ */

/** firestore.rules `validTransaction`, restated so the fake rejects exactly
 *  what the real rules reject (a batch fails as a whole, like Firestore). */
export function passesTransactionRules(doc: Record<string, unknown>, authUid: string): boolean {
  const allowed = ['amount', 'category', 'description', 'userid', 'date', 'source', 'importId', 'originalNarration', 'referenceNumber', 'recurringId'];
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  return (
    doc.userid === authUid &&
    ['amount', 'category', 'description', 'userid', 'date'].every((k) => k in doc) &&
    Object.keys(doc).every((k) => allowed.includes(k)) &&
    Object.values(doc).every((v) => v !== undefined) &&
    typeof doc.amount === 'number' && Number.isFinite(doc.amount) && doc.amount >= 0 && doc.amount < 100000000000 &&
    text(doc.category, 60) &&
    text(doc.description, 500) &&
    typeof doc.date === 'string' && doc.date.length >= 10 && doc.date.length <= 40 &&
    (!('source' in doc) || ['manual', 'import', 'recurring'].includes(doc.source as string)) &&
    (!('importId' in doc) || text(doc.importId, 100)) &&
    (!('originalNarration' in doc) || text(doc.originalNarration, 1000)) &&
    (!('referenceNumber' in doc) || text(doc.referenceNumber, 100)) &&
    (!('recurringId' in doc) || text(doc.recurringId, 100))
  );
}

/**
 * Mimics ExpensesContext/IncomeContext against an in-memory database: the
 * same document mapping (toTransactionDoc / fromTransactionDoc), the same
 * batching (commitInChunks), atomic batches, rules enforced per batch, and
 * reads filtered to the signed-in user.
 */
export class FakeStore {
  uid: string;
  docs = new Map<string, { collection: 'expenses' | 'income'; data: TransactionDoc }>();
  /** Batch numbers (1-based, counted per store) that should fail to commit. */
  failBatches = new Set<number>();
  /** Fail a batch on its first attempt only (a transient error). */
  failOnce = new Set<number>();
  batchesAttempted = 0;
  private nextId = 1;
  private nextBatch = 1;

  constructor(uid = 'test-user') {
    this.uid = uid;
  }

  private async add(collection: 'expenses' | 'income', entries: TransactionFields[], limit?: number): Promise<void> {
    const writes = entries.map((entry) => ({ id: `${collection}-${this.nextId++}`, data: toTransactionDoc(entry, this.uid) }));
    const batchOf = new Map<unknown, number>();
    const result = await commitInChunks(
      writes,
      async (chunk) => {
        this.batchesAttempted++;
        if (!batchOf.has(chunk[0])) batchOf.set(chunk[0], this.nextBatch++);
        const batch = batchOf.get(chunk[0]) as number;
        if (this.failOnce.delete(batch)) throw new Error('unavailable');
        if (this.failBatches.has(batch)) throw new Error('unavailable');
        if (!chunk.every((w) => passesTransactionRules(w.data, this.uid))) throw new Error('permission-denied');
        for (const w of chunk) this.docs.set(w.id, { collection, data: w.data });
      },
      { limit }
    );
    if (result.failed > 0) throw new BulkWriteError(result);
  }

  batchLimit: number | undefined;
  addExpenses = (entries: TransactionFields[]) => this.add('expenses', entries, this.batchLimit);
  addIncomes = (entries: TransactionFields[]) => this.add('income', entries, this.batchLimit);

  private read(collection: 'expenses' | 'income') {
    return [...this.docs.entries()]
      .filter(([, d]) => d.collection === collection && d.data.userid === this.uid)
      .map(([id, d]) => fromTransactionDoc(id, d.data));
  }
  get expenses(): Expense[] { return this.read('expenses') as Expense[]; }
  get income(): Income[] { return this.read('income') as Income[]; }
}

/* ------------------------------------------------------------------ */
/* A real (tiny) text PDF, so the PDF path can be tested from bytes.    */
/* ------------------------------------------------------------------ */

/** Builds a valid single-font text PDF placing each item at its x/y. */
export function buildTextPdf(items: PdfTextItem[]): Uint8Array {
  const pageCount = Math.max(1, ...items.map((i) => i.page));
  const escape = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`);
  const objects: string[] = [];
  const kids = Array.from({ length: pageCount }, (_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  for (let page = 1; page <= pageCount; page++) {
    const stream = items
      .filter((i) => i.page === page)
      .map((i) => `BT /F1 8 Tf ${i.x.toFixed(2)} ${i.y.toFixed(2)} Td (${escape(i.str)}) Tj ET`)
      .join('\n');
    objects[4 + (page - 1) * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + (page - 1) * 2} 0 R >>`;
    objects[5 + (page - 1) * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = pdf.length;
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

/** Splits a long narration the way a bank wraps it: at the last word that fits. */
function splitNarration(text: string, max: number): [string, string] {
  if (text.length <= max) return [text, ''];
  const cut = text.lastIndexOf(' ', max);
  const at = cut > 0 ? cut : max;
  return [text.slice(0, at), text.slice(at).trimStart()];
}

/** The fixture as a PDF laid out in Withdrawal / Deposit / Balance columns,
 *  with amounts right-aligned the way banks print them (Helvetica 8pt). */
export function pdfColumnLayout(rows: FixtureRow[] = FIXTURE, opening = OPENING_BALANCE): PdfTextItem[] {
  const bal = balances(rows, opening);
  // Helvetica digits are 0.556 em, comma/period 0.278 em.
  const width = (text: string) => [...text].reduce((w, c) => w + (/[0-9]/.test(c) ? 0.556 : 0.278), 0) * 8;
  const at = (page: number, y: number, x: number, str: string): PdfTextItem => ({ page, y, x, str, width: 0 });
  const rightAt = (page: number, y: number, end: number, str: string) => at(page, y, end - width(str), str);
  const heading = (page: number) => [at(page, 740, 40, 'Date'), at(page, 740, 100, 'Transaction Remarks'), at(page, 740, 372, 'Withdrawal'), at(page, 740, 452, 'Deposit'), at(page, 740, 530, 'Balance')];
  const items: PdfTextItem[] = [at(1, 770, 40, 'Statement of Account - November 2026'), ...heading(1)];
  rows.forEach((r, i) => {
    const page = i < 9 ? 1 : 2;
    if (i === 9) items.push(...heading(2));
    const y = 715 - (page === 1 ? i : i - 9) * 26;
    items.push(
      at(page, y, 40, `${pad(r.day)}/11/2026`),
      at(page, y, 100, splitNarration(r.narration, 44)[0]),
      rightAt(page, y, r.type === 'debit' ? 412 : 482, money(r.amount)),
      rightAt(page, y, 562, money(bal[i]))
    );
    const [, wrapped] = splitNarration(r.narration, 44);
    if (wrapped) items.push(at(page, y - 10, 100, wrapped));
  });
  return items;
}
