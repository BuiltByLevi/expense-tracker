import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCsvText, type ParseResult } from './csvParser';
import { parseExcelBuffer } from './excelParser';
import { buildHeaderMap, rowsToTransactions } from './columnMapper';
import { detectMonthFirst, normalizeRow, parseIndicator, parseStatementAmount, parseStatementDate } from './normalize';
import { cleanReferenceNumber, extractReferenceNumber, referenceKey } from './referenceNumber';
import { itemsToTransactions, type PdfTextItem } from './pdfStatement';

const ok = (result: ParseResult) => {
  if ('error' in result) throw new Error(result.error.message);
  return result;
};
const ymd = (d: Date | null) => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null);

describe('parseStatementAmount — exact values, never a guess', () => {
  it.each([
    ['1,23,456.78', 123456.78],
    ['₹ 1,23,456.78', 123456.78],
    ['Rs.500', 500],
    ['Rs. 500.00', 500],
    ['INR 500.00', 500],
    ['500.00 Dr', 500],
    ['500.00CR', 500],
    ['500.00 (Cr)', 500],
    ['15.50', 15.5],
    ['0.10', 0.1],
    ['.5', 0.5],
    ['-500.00', -500],
    ['(500.00)', -500],
    ['(1,234.50)', -1234.5],
    ['1,234.50-', -1234.5],
    ['0.00', 0],
  ])('%s -> %s', (raw, expected) => {
    expect(parseStatementAmount(raw)).toBe(expected);
  });

  it.each(['', '-', '  ', 'N/A', 'abc', '12abc', '1.2.3', 'UPI/123', '10/11/2026'])('%j is not an amount', (raw) => {
    expect(parseStatementAmount(raw)).toBeNull();
  });

  it('holds paise exactly through the kind of values that drift in floating point', () => {
    expect(parseStatementAmount('0.1')! + 0).toBe(0.1);
    expect(parseStatementAmount('1005.005')).toBe(1005.01);
    expect(parseStatementAmount('0.30000000000000004')).toBe(0.3); // a computed Excel cell
  });
});

describe('parseStatementDate — the calendar day the bank printed', () => {
  it.each([
    ['01/11/2026', [2026, 11, 1]],
    ['1/11/2026', [2026, 11, 1]],
    ['01-11-2026', [2026, 11, 1]],
    ['01.11.2026', [2026, 11, 1]],
    ['01/11/26', [2026, 11, 1]],
    ['2026-11-30', [2026, 11, 30]],
    ['2026/11/30', [2026, 11, 30]],
    ['30 Nov 2026', [2026, 11, 30]],
    ['30-Nov-2026', [2026, 11, 30]],
    ['30-Nov-26', [2026, 11, 30]],
    ['30/Nov/2026', [2026, 11, 30]],
    ['30 November 2026', [2026, 11, 30]],
    ['Nov 30, 2026', [2026, 11, 30]],
    ['31/12/2026', [2026, 12, 31]],
    ['29/02/2028', [2028, 2, 29]],
  ])('%s', (raw, expected) => {
    expect(ymd(parseStatementDate(raw))).toEqual(expected);
  });

  it.each([
    ['30/11/2026 23:59:59', [2026, 11, 30]],
    ['30/11/2026 00:00:01', [2026, 11, 30]],
    ['30-11-2026 11:59:59 PM', [2026, 11, 30]],
    ['2026-11-30 23:59', [2026, 11, 30]],
    ['2026-11-30T23:59:59', [2026, 11, 30]],
    ['2026-11-30T18:45:00Z', [2026, 11, 30]],
    ['2026-11-30T23:30:00+05:30', [2026, 11, 30]],
    ['30 Nov 2026, 11:15 PM IST', [2026, 11, 30]],
  ])('a timestamp keeps its printed date: %s', (raw, expected) => {
    const date = parseStatementDate(raw);
    expect(ymd(date)).toEqual(expected);
    // Noon UTC on the printed day: the same calendar day for every viewer from UTC-11 to UTC+11.
    expect([date!.getUTCHours(), date!.getUTCMinutes(), date!.getUTCSeconds()]).toEqual([12, 0, 0]);
  });

  it.each(['', 'abc', '32/01/2026', '31/02/2026', '00/00/0000', 'Opening Balance'])('%j is not a date', (raw) => {
    expect(parseStatementDate(raw)).toBeNull();
  });

  it('reads day-first by default and month-first only when the file proves it', () => {
    expect(ymd(parseStatementDate('03/11/2026'))).toEqual([2026, 11, 3]);
    expect(detectMonthFirst(['03/11/2026', '30/11/2026'])).toBe(false);
    expect(detectMonthFirst(['03/11/2026', '04/11/2026'])).toBe(false); // ambiguous -> Indian default
    expect(detectMonthFirst(['11/03/2026', '11/30/2026'])).toBe(true);
    expect(ymd(parseStatementDate('11/03/2026', { monthFirst: true }))).toEqual([2026, 11, 3]);
  });
});

describe('debit/credit comes from the statement structure', () => {
  it.each([
    ['DR', 'debit'], ['Dr.', 'debit'], ['D', 'debit'], ['Debit', 'debit'], ['Withdrawal', 'debit'],
    ['CR', 'credit'], ['cr', 'credit'], ['C', 'credit'], ['Credit', 'credit'], ['Deposit', 'credit'], ['(Cr)', 'credit'],
    ['500.00 Dr', 'debit'], ['500.00CR', 'credit'],
  ])('marker %s -> %s', (raw, expected) => {
    expect(parseIndicator(raw)).toBe(expected);
  });

  it.each(['', 'UPI', 'NEFT', 'TRANSFER', '500.00', 'CREDIT CARD PAYMENT'])('%j is not a marker', (raw) => {
    expect(parseIndicator(raw)).toBeNull();
  });

  it('separate columns: the column decides, whatever the narration says', () => {
    expect(normalizeRow({ date: '01/11/2026', narration: 'SALARY CREDIT RAZORPAY REFUND', debit: '500.00' })).toMatchObject({ type: 'debit', amount: 500, parseIssue: null });
    expect(normalizeRow({ date: '01/11/2026', narration: 'UPI ATM WDL POS PURCHASE EMI', credit: '500.00' })).toMatchObject({ type: 'credit', amount: 500, parseIssue: null });
  });

  it('a withdrawal printed negative or in brackets in the debit column is still a withdrawal of that size', () => {
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', debit: '-450.00' })).toMatchObject({ type: 'debit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', debit: '(450.00)', credit: '0.00' })).toMatchObject({ type: 'debit', amount: 450 });
  });

  it('single amount: marker column, inline suffix, then sign', () => {
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '450.00', indicator: 'DR' })).toMatchObject({ type: 'debit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '450.00', indicator: 'CR' })).toMatchObject({ type: 'credit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '450.00 Dr' })).toMatchObject({ type: 'debit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '(450.00)' })).toMatchObject({ type: 'debit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '-450.00' })).toMatchObject({ type: 'debit', amount: 450 });
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', amount: '450.00' }, { signedAmounts: true })).toMatchObject({ type: 'credit', amount: 450 });
  });

  it('single unsigned amount with nothing to go on keeps the amount and asks, rather than guessing', () => {
    const tx = normalizeRow({ date: '01/11/2026', narration: 'SALARY', amount: '450.00' });
    expect(tx).toMatchObject({ type: null, amount: 450 });
    expect(tx.parseIssue).toMatch(/withdrawal or a deposit/);
  });

  it('both columns filled is flagged, not guessed', () => {
    expect(normalizeRow({ date: '01/11/2026', narration: 'X', debit: '10', credit: '20' })).toMatchObject({ type: null, amount: null });
  });

  it('a blank description does not stop a row being read', () => {
    expect(normalizeRow({ date: '01/11/2026', debit: '10.00' })).toMatchObject({ type: 'debit', amount: 10, narration: '(no description)' });
  });
});

describe('column recognition across banks', () => {
  const fields = (headers: string[]) => headers.map((h) => buildHeaderMap(headers).get(h) ?? null);

  it.each([
    ['HDFC', ['Date', 'Narration', 'Chq./Ref.No.', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'],
      ['date', 'narration', 'referenceNumber', 'valueDate', 'debit', 'credit', 'balance']],
    ['SBI', ['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance'],
      ['date', 'valueDate', 'narration', 'referenceNumber', 'debit', 'credit', 'balance']],
    ['ICICI', ['S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount (INR )', 'Deposit Amount (INR )', 'Balance (INR )'],
      [null, 'valueDate', 'date', 'referenceNumber', 'narration', 'debit', 'credit', 'balance']],
    ['Axis', ['Tran Date', 'CHQNO', 'PARTICULARS', 'DR', 'CR', 'BAL', 'SOL'],
      ['date', 'referenceNumber', 'narration', 'debit', 'credit', 'balance', null]],
    ['Kotak', ['Sl. No.', 'Date', 'Description', 'Chq / Ref number', 'Amount', 'Dr / Cr', 'Balance'],
      [null, 'date', 'narration', 'referenceNumber', 'amount', 'indicator', 'balance']],
    ['generic', ['Transaction Date', 'Transaction Details', 'Debit/Credit', 'Transaction Amount', 'Available Balance'],
      ['date', 'narration', 'indicator', 'amount', 'balance']],
  ])('%s headers', (_bank, headers, expected) => {
    expect(fields(headers)).toEqual(expected);
  });

  it('a file with only Date + Amount + Dr/Cr is accepted (it used to be rejected outright)', () => {
    const { transactions } = ok(parseCsvText('Date,Description,Amount,Dr/Cr\n01/11/2026,SALARY,50000.00,CR\n02/11/2026,UPI/SHOP,450.00,DR'));
    expect(transactions.map((t) => [t.type, t.amount])).toEqual([['credit', 50000], ['debit', 450]]);
  });

  it('unrecognisable columns give a clear error instead of an empty import', () => {
    const result = parseCsvText('Foo,Bar\n1,2');
    expect('error' in result && result.error.code).toBe('PARSE_FAILED');
  });

  it('a byte-order mark does not hide the first header', () => {
    expect(ok(parseCsvText('﻿Date,Narration,Debit,Credit\n01/11/2026,X,10.00,')).transactions).toHaveLength(1);
  });
});

describe('rows that are not transactions', () => {
  const file = [
    'Date,Narration,Debit,Credit,Balance',
    ',Opening Balance,,,"10,000.00"',
    '01/11/2026,SALARY ACME,,"50,000.00","60,000.00"',
    ',PVT LTD NOV 2026,,,',
    '02/11/2026,UPI/SHOP,450.00,,"59,550.00"',
    ',,,,',
    ',Total,450.00,"50,000.00",',
    ',Closing Balance,,,"59,550.00"',
    'This is a computer generated statement,,,,',
    ',Legends: UPI - Unified Payments Interface,,,',
  ].join('\n');

  it('opening, total, closing and footer lines are set aside; wrapped narration is joined; nothing else is lost', () => {
    const result = ok(parseCsvText(file));
    expect(result.transactions.map((t) => [t.narration, t.type, t.amount])).toEqual([
      ['SALARY ACME PVT LTD NOV 2026', 'credit', 50000],
      ['UPI/SHOP', 'debit', 450],
    ]);
    // 8 non-blank rows = 2 transactions + 1 wrapped line + 5 non-transaction lines.
    expect(result.stats).toEqual({ dataRows: 8, nonTransactionRows: 5, continuationRows: 1 });
  });

  it('an opening balance repeated in the deposit column is not imported as income', () => {
    const { transactions } = ok(parseCsvText('Date,Narration,Debit,Credit,Balance\n01/11/2026,OPENING BALANCE,,10000.00,10000.00\n01/11/2026,SALARY,,50000.00,60000.00'));
    expect(transactions.map((t) => t.narration)).toEqual(['SALARY']);
  });

  it('a dated, money-moving row is always kept, even when its narration reads like a summary', () => {
    const { transactions } = ok(parseCsvText('Date,Narration,Debit,Credit\n01/11/2026,UPI/SHOP,10.00,\n02/11/2026,TOTAL ENERGIES FUEL,900.00,\n03/11/2026,BALANCE TRANSFER FEE,50.00,'));
    expect(transactions.map((t) => t.amount)).toEqual([10, 900, 50]);
  });

  it('a row with an amount but an unreadable date is kept and flagged, not dropped', () => {
    const { transactions } = ok(parseCsvText('Date,Narration,Debit,Credit\n01/11/2026,A,10.00,\nsoon,B,20.00,'));
    expect(transactions).toHaveLength(2);
    expect(transactions[1]).toMatchObject({ date: null, amount: 20, type: 'debit' });
    expect(transactions[1].parseIssue).toMatch(/date/);
  });
});

describe('direction from the running balance (single unsigned amount column)', () => {
  it('fills in every row, including the first, when the file states its opening balance', () => {
    const { transactions } = ok(parseCsvText([
      'Date,Narration,Amount,Balance',
      ',Opening Balance,,10000.00',
      '01/11/2026,SALARY,50000.00,60000.00',
      '02/11/2026,UPI/SHOP,450.00,59550.00',
      '03/11/2026,ATM WDL,2000.00,57550.00',
    ].join('\n')));
    expect(transactions.map((t) => [t.type, t.parseIssue])).toEqual([['credit', null], ['debit', null], ['debit', null]]);
  });

  it('works for a newest-first export', () => {
    const { transactions } = ok(parseCsvText([
      'Date,Narration,Amount,Balance',
      '03/11/2026,ATM WDL,2000.00,57550.00',
      '02/11/2026,UPI/SHOP,450.00,59550.00',
      '01/11/2026,SALARY,50000.00,60000.00',
    ].join('\n')));
    // The oldest row has no earlier balance to compare with, so it stays for review.
    expect(transactions.map((t) => t.type)).toEqual(['debit', 'debit', null]);
  });

  it('never invents a direction the balances do not prove', () => {
    const { transactions } = ok(parseCsvText('Date,Narration,Amount,Balance\n01/11/2026,A,100.00,5000.00\n02/11/2026,B,100.00,9999.00'));
    expect(transactions.map((t) => t.type)).toEqual([null, null]);
  });
});

describe('Excel workbooks', () => {
  const book = (rows: unknown[][], bookType: 'xlsx' | 'biff8' = 'xlsx') => {
    const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
    return XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;
  };

  it.each(['xlsx', 'biff8'] as const)('%s: real date cells keep their day and month (3 Nov is not 11 Mar)', (type) => {
    const { transactions } = ok(parseExcelBuffer(book([
      ['Date', 'Narration', 'Debit', 'Credit'],
      [new Date(2026, 10, 3), 'A', 10, null],
      [new Date(2026, 10, 30), 'B', null, 20],
      [new Date(2026, 11, 31), 'C', 30, null],
      [new Date(2027, 0, 1), 'D', null, 40],
    ], type)));
    expect(transactions.map((t) => ymd(t.date))).toEqual([[2026, 11, 3], [2026, 11, 30], [2026, 12, 31], [2027, 1, 1]]);
    expect(transactions.every((t) => t.parseIssue === null)).toBe(true);
  });

  it('a date cell with a time of day stays on its own day', () => {
    const { transactions } = ok(parseExcelBuffer(book([
      ['Date', 'Narration', 'Debit', 'Credit'],
      [new Date(2026, 10, 30, 23, 59, 58), 'LATE', 10, null],
    ])));
    expect(ymd(transactions[0].date)).toEqual([2026, 11, 30]);
  });

  it('amounts come from the stored value, not the rounded display', () => {
    const sheet = XLSX.utils.aoa_to_sheet([['Date', 'Narration', 'Debit', 'Credit'], ['30/11/2026', 'INTEREST', null, 15.5], ['30/11/2026', 'FEE', 1234.56, null]]);
    sheet.D2.z = '0'; // displays "16"
    sheet.C3.z = '#,##0'; // displays "1,235"
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'S');
    const { transactions } = ok(parseExcelBuffer(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
    expect(transactions.map((t) => t.amount)).toEqual([15.5, 1234.56]);
  });

  it('a numeric reference keeps all its digits', () => {
    const { transactions } = ok(parseExcelBuffer(book([['Date', 'Narration', 'Ref No', 'Debit', 'Credit'], ['30/11/2026', 'UPI PAYMENT', 631412345001, 10, null]])));
    expect(transactions[0].referenceNumber).toBe('631412345001');
  });

  it('text dates and text amounts in a workbook still parse', () => {
    const { transactions } = ok(parseExcelBuffer(book([['Date', 'Narration', 'Debit', 'Credit'], ['30/11/2026', 'X', '1,200.50', '']])));
    expect(transactions[0]).toMatchObject({ type: 'debit', amount: 1200.5 });
    expect(ymd(transactions[0].date)).toEqual([2026, 11, 30]);
  });

  it('finds the statement on a later sheet', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Summary'], ['nothing here']]), 'Cover');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Date', 'Narration', 'Debit', 'Credit'], ['30/11/2026', 'X', 5, null]]), 'Txns');
    expect(ok(parseExcelBuffer(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))).transactions).toHaveLength(1);
  });

  it('garbage bytes give an error, not a crash', () => {
    const result = parseExcelBuffer(new Uint8Array([1, 2, 3, 4]));
    expect('error' in result || result.transactions.length === 0).toBe(true);
  });
});

describe('reference numbers', () => {
  it.each(['0000000000000000', '0', '-', '--', 'NA', 'N/A', 'NIL', '', '   '])('%j is a placeholder, not a reference', (raw) => {
    expect(cleanReferenceNumber(raw)).toBeNull();
    expect(referenceKey(raw)).toBeNull();
  });

  it('the same reference compares equal however a format pads or cases it', () => {
    expect(referenceKey('0000631412345001')).toBe(referenceKey('631412345001'));
    expect(referenceKey('n307260000123456')).toBe(referenceKey('N307260000123456'));
    expect(referenceKey('UTR-123/456')).toBe('UTR123456');
  });

  it('a placeholder in the reference column falls back to the reference inside the narration', () => {
    expect(normalizeRow({ date: '01/11/2026', narration: 'UPI/631412345001/BIGBASKET', referenceNumber: '0000000000000000', debit: '10' }).referenceNumber).toBe('631412345001');
    expect(normalizeRow({ date: '01/11/2026', narration: 'POS SHOP', referenceNumber: '0000000000000000', debit: '10' }).referenceNumber).toBeNull();
  });

  it('extracts UPI and NEFT/IMPS/RTGS references from narrations', () => {
    expect(extractReferenceNumber('UPI/631412345001/BIGBASKET/GROCERY')).toBe('631412345001');
    expect(extractReferenceNumber('NEFT-N307260000123456-RAZORPAY SOFTWARE')).toBe('N307260000123456');
    expect(extractReferenceNumber('IMPS/630912345678/RAZORPAY SETTLEMENT')).toBe('630912345678');
    expect(extractReferenceNumber('ATM WDL 00123 PUNE')).toBeNull();
  });
});

describe('text PDF layouts', () => {
  const at = (y: number, x: number, str: string): PdfTextItem => ({ page: 1, y, x, str, width: str.length * 4.2 });

  it('single Amount column with Dr/Cr markers: every row gets its direction, including the first', () => {
    const txs = itemsToTransactions([
      at(700, 25, '01-11-2026'), at(700, 90, 'SALARY ACME'), at(700, 380, '50,000.00 Cr'), at(700, 480, '60,000.00 Cr'),
      at(680, 25, '02-11-2026'), at(680, 90, 'UPI/SHOP'), at(680, 380, '450.00'), at(680, 412, 'Dr'), at(680, 480, '59,550.00 Cr'),
      at(660, 25, '03-11-2026'), at(660, 90, 'ATM WDL'), at(660, 380, '2,000.00(Dr)'), at(660, 480, '57,550.00(Cr)'),
    ]);
    expect(txs.map((t) => [t.type, t.amount, t.balance, t.parseIssue])).toEqual([
      ['credit', 50000, 60000, null],
      ['debit', 450, 59550, null],
      ['debit', 2000, 57550, null],
    ]);
  });

  it('no markers and no column headings: the opening balance line lets the balance decide from row one', () => {
    const txs = itemsToTransactions([
      at(730, 25, 'Opening Balance 10,000.00'),
      at(700, 25, '01-11-2026'), at(700, 90, 'SALARY ACME'), at(700, 380, '50,000.00'), at(700, 480, '60,000.00'),
      at(680, 25, '02-11-2026'), at(680, 90, 'UPI/SHOP'), at(680, 380, '450.00'), at(680, 480, '59,550.00'),
      at(660, 25, 'Closing Balance 59,550.00'),
    ]);
    expect(txs.map((t) => [t.type, t.amount])).toEqual([['credit', 50000], ['debit', 450]]);
    expect(txs[1].narration).toBe('UPI/SHOP'); // the closing line is not glued onto the last row
  });

  it('a narration beginning with "Dr" is not mistaken for a debit marker', () => {
    const [tx] = itemsToTransactions([at(700, 25, '01-11-2026'), at(700, 90, 'REFUND'), at(700, 300, '500.00'), at(700, 340, 'DR SHARMA CLINIC'), at(700, 480, '10,500.00')]);
    expect(tx.type).toBeNull(); // undetermined -> user review, rather than a wrong debit
    expect(tx.amount).toBe(500);
  });
});

describe('tabular parse result bookkeeping', () => {
  it('rows in = transactions + wrapped lines + non-transaction lines, always', () => {
    const rows = [
      ['Date', 'Narration', 'Debit', 'Credit', 'Balance'],
      ['', 'B/F', '', '', '100.00'],
      ['01/11/2026', 'A', '10.00', '', '90.00'],
      ['', 'more text', '', '', ''],
      ['bad', 'B', '', '5.00', '95.00'],
      ['', 'Grand Total', '10.00', '5.00', ''],
    ];
    const result = rowsToTransactions(rows);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.length + result.continuationRows + result.nonTransactionRows).toBe(result.dataRows);
  });
});
