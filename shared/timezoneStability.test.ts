import { afterEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCsvText } from './statementParsers/csvParser';
import { parseExcelBuffer } from './statementParsers/excelParser';
import { itemsToTransactions, type PdfTextItem } from './statementParsers/pdfStatement';
import { parseStatementDate } from './statementParsers/normalize';
import { fromTransactionDoc, toTransactionDoc } from './transactionDoc';

/**
 * A bank statement's printed date must read back as the same calendar day
 * wherever the file was imported and wherever it is viewed. Zones run from
 * UTC-11 to UTC+11, the window in which a noon-UTC anchor keeps the day.
 */
const ZONES = [
  'Pacific/Pago_Pago', // UTC-11
  'Pacific/Honolulu', // UTC-10
  'America/Los_Angeles', // UTC-8 / -7
  'America/New_York', // UTC-5 / -4
  'America/Sao_Paulo', // UTC-3
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata', // UTC+5:30
  'Asia/Kathmandu', // UTC+5:45
  'Asia/Tokyo', // UTC+9
  'Australia/Sydney', // UTC+10 / +11
];

const originalTz = process.env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});
const inZone = <T,>(zone: string, fn: () => T): T => {
  process.env.TZ = zone;
  try {
    return fn();
  } finally {
    // Restored by the afterEach hook; keep the zone for the rest of this call.
  }
};

/** The calendar day a viewer in the current zone sees. */
const dayOf = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

// Printed days that sit on month and year boundaries.
const EDGE_DAYS: { raw: string; day: [number, number, number] }[] = [
  { raw: '31/10/2026', day: [2026, 10, 31] },
  { raw: '01/11/2026', day: [2026, 11, 1] },
  { raw: '30/11/2026', day: [2026, 11, 30] },
  { raw: '31/12/2026', day: [2026, 12, 31] },
  { raw: '01/01/2027', day: [2027, 1, 1] },
];

describe('the stored date is anchored to the printed calendar day', () => {
  it('an Indian import stores noon UTC on the printed day, not the previous evening', () => {
    inZone('Asia/Kolkata', () => {
      const d = parseStatementDate('01/11/2026')!;
      expect(d.toISOString()).toBe('2026-11-01T12:00:00.000Z');
    });
  });

  it.each(ZONES)('parsed in %s, the printed day survives save and read back in every zone', (importZone) => {
    const stored = EDGE_DAYS.map(({ raw }) => {
      process.env.TZ = importZone;
      const date = parseStatementDate(raw)!;
      return toTransactionDoc({ amount: 1, category: 'Other', description: raw, date }, 'u').date;
    });

    for (const viewZone of ZONES) {
      process.env.TZ = viewZone;
      EDGE_DAYS.forEach(({ day }, i) => {
        const read = fromTransactionDoc('id', { date: stored[i], amount: 1, category: 'Other', description: '', userid: 'u' });
        expect(dayOf(read.date), `import ${importZone}, view ${viewZone}, day ${EDGE_DAYS[i].raw}`).toEqual(day);
      });
    }
  });

  it.each(ZONES)('late-night timestamps in %s keep their printed day', (zone) => {
    const stamps: [string, [number, number, number]][] = [
      ['30/11/2026 23:59:59', [2026, 11, 30]],
      ['01/12/2026 00:00:01', [2026, 12, 1]],
      ['30-11-2026 11:59:59 PM', [2026, 11, 30]],
      ['2026-11-30T23:59:59', [2026, 11, 30]],
    ];
    process.env.TZ = zone;
    for (const [raw, day] of stamps) {
      expect(dayOf(parseStatementDate(raw)!), raw).toEqual(day);
    }
  });

  it.each(ZONES)('CSV date-only values in %s keep their day', (zone) => {
    process.env.TZ = zone;
    const csv = ['Date,Narration,Debit,Credit', ...EDGE_DAYS.map((e, i) => `${e.raw},CSV ROW ${i},${100 + i},`)].join('\n');
    const result = parseCsvText(csv);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.transactions.map((t) => dayOf(t.date!))).toEqual(EDGE_DAYS.map((e) => e.day));
  });

  it.each(ZONES)('Excel serial dates in %s keep their day, including month-end', (zone) => {
    process.env.TZ = zone;
    // Serial for midnight UTC of each day — what Excel itself stores.
    const rows: (string | number)[][] = [['Date', 'Narration', 'Withdrawal', 'Deposit', 'Balance']];
    EDGE_DAYS.forEach((e, i) => {
      const [y, m, d] = e.day;
      rows.push([Date.UTC(y, m - 1, d) / 86_400_000 + 25_569, `XLS ROW ${i}`, 100 + i, '', 1000]);
    });
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    for (let r = 1; r <= EDGE_DAYS.length; r++) sheet[`A${r + 1}`].z = 'dd/mm/yyyy';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Statement');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const result = parseExcelBuffer(buffer);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.transactions.map((t) => dayOf(t.date!))).toEqual(EDGE_DAYS.map((e) => e.day));
  });

  it.each(ZONES)('PDF transaction dates in %s keep their day', (zone) => {
    process.env.TZ = zone;
    const items: PdfTextItem[] = [];
    const put = (page: number, x: number, y: number, str: string) => items.push({ page, x, y, str, width: str.length * 5 });
    put(1, 10, 700, 'Date');
    put(1, 80, 700, 'Narration');
    put(1, 300, 700, 'Withdrawal');
    put(1, 400, 700, 'Deposit');
    put(1, 500, 700, 'Balance');
    EDGE_DAYS.forEach((e, i) => {
      const y = 600 - i * 20;
      put(1, 10, y, e.raw);
      put(1, 80, y, `PDF ROW ${i}`);
      put(1, 300, y, (100 + i).toFixed(2));
      put(1, 500, y, (1000 - i).toFixed(2));
    });
    const txs = itemsToTransactions(items);
    expect(txs.map((t) => dayOf(t.date!))).toEqual(EDGE_DAYS.map((e) => e.day));
  });
});
