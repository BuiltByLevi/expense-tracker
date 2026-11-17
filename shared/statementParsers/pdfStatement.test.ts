import { describe, it, expect } from 'vitest';
import { itemsToTransactions, type PdfTextItem } from './pdfStatement';

// Geometry measured from a real ICICI "OpTransactionHistory" PDF: amounts are
// right-aligned under Withdrawal (ends x≈453), Deposit (≈519), Balance (≈571).
const CHAR = 4.2;
const left = (page: number, y: number, x: number, str: string): PdfTextItem => ({ page, y, x, str, width: str.length * CHAR });
const right = (page: number, y: number, end: number, str: string): PdfTextItem => ({ page, y, x: end - str.length * CHAR, str, width: str.length * CHAR });

function header(page: number, y: number): PdfTextItem[] {
  return [
    left(page, y, 300, 'Transaction'), left(page, y, 399, 'Withdrawal'), left(page, y, 474, 'Deposit'), left(page, y, 532, 'Balance'),
    left(page, y - 10, 25, 'S No.'), left(page, y - 10, 61, 'Date'), left(page, y - 10, 396, 'Amount (INR)'), left(page, y - 10, 462, 'Amount (INR)'), left(page, y - 10, 538, '(INR)'),
  ];
}

/** One statement row: bold title 5pt above the dated line, narration below. */
function row(page: number, y: number, serial: number, date: string, column: 'w' | 'd', amount: string, balance: string, title: string, narration: string[]): PdfTextItem[] {
  return [
    left(page, y + 5, 110, title),
    left(page, y, 25, String(serial)), left(page, y, 61, date),
    right(page, y, column === 'w' ? 453 : 519, amount), right(page, y, 571, balance),
    ...narration.map((text, i) => left(page, y - 5 - i * 10, 110, text)),
  ];
}

describe('itemsToTransactions', () => {
  it('reads withdrawal/deposit from the column the amount sits under — including the very first row', () => {
    const txs = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '01.06.2026', 'w', '70.00', '34643.35', 'PREMIUM MI', ['UPI/PREMIUM MI/paytmqr68girx@/DAHI AND L/YES', 'BANK L/651827240101/YCD391aeab04f544cc7bac9cc4b']),
      ...row(1, 620, 2, '30.06.2026', 'd', '151.00', '34794.35', 'Credit trxn', ['169701520337:Int.Pd:30-03-2026 to 29-06-2026']),
      ...row(1, 590, 3, '30.06.2026', 'd', '34905.00', '69699.35', 'RZPX PVT LTD PAYROLL COMPLIANCE', ['NEFT-IDFB6181M5999519-RZPX PVT LTD', 'PAYROLL COMPLIANCE ESCROW ACCOUNT-']),
      ...row(1, 550, 4, '30.06.2026', 'w', '30.00', '69669.35', 'Eleven Pun', ['UPI/Eleven Pun/25186623099692/Snaks/JIO']),
    ]);

    expect(txs.map((t) => [t.type, t.amount, t.balance])).toEqual([
      ['debit', 70, 34643.35],
      ['credit', 151, 34794.35],
      ['credit', 34905, 69699.35],
      ['debit', 30, 69669.35],
    ]);
    expect(txs.every((t) => t.parseIssue === null)).toBe(true);
  });

  it('keeps each bold title with its own row, never the row above', () => {
    const [, interest, salary, snack] = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '29.06.2026', 'w', '45.00', '5250.13', 'PREMIUM MI', ['UPI/PREMIUM MI/paytmqr68girx@/Paid via C/YES']),
      ...row(1, 630, 2, '30.06.2026', 'd', '151.00', '5401.13', 'Credit trxn', ['169701520337:Int.Pd:30-03-2026 to 29-06-2026']),
      ...row(1, 600, 3, '30.06.2026', 'd', '34905.00', '40306.13', 'RZPX PVT LTD PAYROLL COMPLIANCE', ['NEFT-IDFB6181M5999519-RZPX PVT LTD', 'PAYROLL COMPLIANCE ESCROW ACCOUNT-']),
      ...row(1, 560, 4, '30.06.2026', 'w', '30.00', '40276.13', 'Eleven Pun', ['UPI/Eleven Pun/25186623099692/Snaks/JIO']),
    ]);

    expect(interest.narration).toMatch(/^Credit trxn .*Int\.Pd/);
    expect(interest.narration).not.toMatch(/PAYROLL/i);
    expect(salary.narration).toMatch(/PAYROLL/i);
    expect(salary.narration).not.toMatch(/Eleven Pun/i);
    expect(snack.narration).toBe('UPI/Eleven Pun/25186623099692/Snaks/JIO');
  });

  it('pulls the bank reference out of the narration', () => {
    const [upi, neft, plain] = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '01.06.2026', 'w', '70.00', '930.00', 'Shop', ['UPI/Shop/shop@upi/Paid/YES BANK/651827240101/YCD391']),
      ...row(1, 630, 2, '02.06.2026', 'd', '500.00', '1430.00', 'Payroll', ['NEFT-IDFB6181M5999519-ACME LTD']),
      ...row(1, 600, 3, '03.06.2026', 'w', '30.00', '1400.00', 'Bil Payment', ['BIL/Consumer Loans XX61053 EMI']),
    ]);
    expect(upi.referenceNumber).toBe('651827240101');
    expect(neft.referenceNumber).toBe('IDFB6181M5999519');
    expect(plain.referenceNumber).toBeNull();
  });

  it('stops at the end of the table instead of swallowing the page footer, and carries on after a page break', () => {
    const txs = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '01.06.2026', 'w', '100.00', '900.00', 'Shop A', ['UPI/Shop A/a@upi']),
      left(1, 400, 40, 'This is a system generated statement. Hence, it does not require any signature.'),
      left(1, 380, 40, 'Legends used in this statement'),
      ...header(2, 700),
      ...row(2, 660, 2, '02.06.2026', 'd', '50.00', '950.00', 'Refund', ['UPI/Shop A/Refund']),
    ]);
    expect(txs).toHaveLength(2);
    expect(txs[0].narration).toBe('UPI/Shop A/a@upi');
    expect(txs[1].type).toBe('credit');
    expect(txs[1].parseIssue).toBeNull();
  });

  it('flags a row whose printed balance does not follow from the row before it', () => {
    const txs = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '01.06.2026', 'w', '100.00', '900.00', 'Shop A', ['UPI/Shop A/a@upi']),
      ...row(1, 630, 2, '02.06.2026', 'w', '50.00', '700.00', 'Shop B', ['UPI/Shop B/b@upi']),
    ]);
    expect(txs[0].parseIssue).toBeNull();
    expect(txs[1].parseIssue).toMatch(/balance/i);
  });

  it('without column headings, works direction out from the running balance', () => {
    const line = (y: number, date: string, amount: string, balance: string, text: string): PdfTextItem[] => [
      left(1, y, 30, date), left(1, y, 100, text), right(1, y, 450, amount), right(1, y, 560, balance),
    ];
    const txs = itemsToTransactions([
      ...line(700, '01/06/2026', '100.00', '900.00', 'ATM WDL'),
      ...line(688, '02/06/2026', '250.00', '650.00', 'UPI SWIGGY'),
      ...line(676, '03/06/2026', '1,000.00', '1,650.00', 'NEFT SALARY'),
    ]);
    expect(txs[0].type).toBeNull(); // nothing before it to compare against
    expect(txs[0].parseIssue).not.toBeNull();
    expect(txs.slice(1).map((t) => [t.type, t.amount, t.parseIssue])).toEqual([
      ['debit', 250, null],
      ['credit', 1000, null],
    ]);
  });

  it('flips a newest-first statement so rows come out oldest-first', () => {
    const txs = itemsToTransactions([
      ...header(1, 700),
      ...row(1, 660, 1, '03.06.2026', 'd', '500.00', '1350.00', 'Salary', ['NEFT SALARY']),
      ...row(1, 630, 2, '02.06.2026', 'w', '50.00', '850.00', 'Shop B', ['UPI/Shop B']),
      ...row(1, 600, 3, '01.06.2026', 'w', '100.00', '900.00', 'Shop A', ['UPI/Shop A']),
    ]);
    expect(txs.map((t) => t.amount)).toEqual([100, 50, 500]);
    expect(txs.every((t) => t.parseIssue === null)).toBe(true);
  });
});

describe('narration text in PDF statements', () => {
  // A small Withdrawal / Deposit / Balance layout, one item per printed cell.
  const cell = (page: number, x: number, y: number, str: string): PdfTextItem => ({ page, x, y, str, width: str.length * 5 });
  const header = [cell(1, 10, 700, 'Date'), cell(1, 80, 700, 'Narration'), cell(1, 300, 700, 'Withdrawal'), cell(1, 400, 700, 'Deposit'), cell(1, 500, 700, 'Balance')];
  const day = (txs: ReturnType<typeof itemsToTransactions>) => txs.map((t) => [t.date!.getFullYear(), t.date!.getMonth() + 1, t.date!.getDate()]);

  it('keeps the date of an INT.PD: TO row whose period is printed on the next line', () => {
    const items = [
      ...header,
      cell(1, 10, 600, '30-11-2026'), cell(1, 80, 600, 'INT.PD: TO'), cell(1, 400, 600, '15.50'), cell(1, 500, 600, '10,015.50'),
      cell(1, 80, 588, '01-08-2026 TO 31-10-2026'),
      cell(1, 10, 560, '01-12-2026'), cell(1, 80, 560, 'UPI/SHOP'), cell(1, 300, 560, '100.00'), cell(1, 500, 560, '9,915.50'),
    ];
    const txs = itemsToTransactions(items);
    // The wrapped period is narration, not a transaction: exactly two rows, with the printed dates.
    expect(day(txs)).toEqual([[2026, 11, 30], [2026, 12, 1]]);
    expect(txs[0]).toMatchObject({ type: 'credit', amount: 15.5, narration: 'INT.PD: TO 01-08-2026 TO 31-10-2026' });
    expect(txs.every((t) => t.parseIssue === null)).toBe(true);
  });

  it('keeps dates that are part of a narration on the same line', () => {
    const items = [...header, cell(1, 10, 600, '30-11-2026'), cell(1, 80, 600, 'INT.PD:01-08-2026 TO 31-10-2026'), cell(1, 400, 600, '15.50'), cell(1, 500, 600, '10,015.50')];
    const [tx] = itemsToTransactions(items);
    expect(tx.narration).toBe('INT.PD:01-08-2026 TO 31-10-2026');
    expect(tx.amount).toBe(15.5);
  });

  it('a dated line with no amount under a transaction is narration, never a transaction of its own', () => {
    const items = [...header, cell(1, 10, 600, '30-11-2026'), cell(1, 80, 600, 'INT.PD: TO'), cell(1, 400, 600, '15.50'), cell(1, 500, 600, '10,015.50'), cell(1, 80, 588, '31-10-2026 PERIOD CREDIT')];
    const txs = itemsToTransactions(items);
    expect(day(txs)).toEqual([[2026, 11, 30]]);
    expect(txs[0].narration).toBe('INT.PD: TO 31-10-2026 PERIOD CREDIT');
  });
});
