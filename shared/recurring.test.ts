import { describe, it, expect } from 'vitest';
import { dueOccurrences, nextOccurrence, occurrenceDate, ordinal, recurringEntryId, type RecurringRule } from './recurring';

const rule = (o: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1', kind: 'expense', amount: 18000, category: 'Rent', description: 'House rent',
  dayOfMonth: 5, startMonth: '2026-09', endMonth: null, active: true, lastGenerated: null, ...o,
});
const keys = (r: RecurringRule, today: Date) => dueOccurrences(r, today).map((o) => o.monthKey);

describe('occurrenceDate', () => {
  it('clamps to the last day of short months', () => {
    expect(occurrenceDate(2026, 1, 31).getDate()).toBe(28);
    expect(occurrenceDate(2028, 1, 31).getDate()).toBe(29);
    expect(occurrenceDate(2026, 3, 31).getDate()).toBe(30);
  });
});

describe('dueOccurrences', () => {
  it('back-fills every month from the start up to today, including this month once the day has passed', () => {
    expect(keys(rule(), new Date(2026, 10, 15))).toEqual(['2026-09', '2026-10', '2026-11']);
  });
  it('skips this month when its day has not arrived yet', () => {
    expect(keys(rule({ dayOfMonth: 20 }), new Date(2026, 10, 15))).toEqual(['2026-09', '2026-10']);
  });
  it('continues after the last generated month', () => {
    expect(keys(rule({ lastGenerated: '2026-10' }), new Date(2026, 10, 15))).toEqual(['2026-11']);
    expect(keys(rule({ lastGenerated: '2026-11' }), new Date(2026, 10, 15))).toEqual([]);
  });
  it('stops at the end month and ignores paused or zero-amount rules', () => {
    expect(keys(rule({ endMonth: '2026-10' }), new Date(2026, 10, 15))).toEqual(['2026-09', '2026-10']);
    expect(keys(rule({ active: false }), new Date(2026, 10, 15))).toEqual([]);
    expect(keys(rule({ amount: 0 }), new Date(2026, 10, 15))).toEqual([]);
  });
  it('crosses year boundaries and caps the catch-up at 24 months', () => {
    expect(keys(rule({ startMonth: '2026-11' }), new Date(2027, 1, 10))).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    const many = keys(rule({ startMonth: '2020-01' }), new Date(2026, 10, 15));
    expect(many).toHaveLength(24);
    expect(many[23]).toBe('2026-11');
  });
});

describe('nextOccurrence', () => {
  it('is this month when the day is still ahead, otherwise next month', () => {
    expect(nextOccurrence(rule({ dayOfMonth: 20, lastGenerated: '2026-10' }), new Date(2026, 10, 15))?.getDate()).toBe(20);
    const d = nextOccurrence(rule({ lastGenerated: '2026-11' }), new Date(2026, 10, 15))!;
    expect([d.getMonth(), d.getDate()]).toEqual([11, 5]);
  });
  it('is null when paused or past the end month', () => {
    expect(nextOccurrence(rule({ active: false }), new Date(2026, 10, 15))).toBeNull();
    expect(nextOccurrence(rule({ endMonth: '2026-11', lastGenerated: '2026-11' }), new Date(2026, 10, 15))).toBeNull();
  });
});

describe('helpers', () => {
  it('builds ids and ordinals', () => {
    expect(recurringEntryId('abc', '2026-11')).toBe('rec_abc_2026-11');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '31st']);
  });
});
