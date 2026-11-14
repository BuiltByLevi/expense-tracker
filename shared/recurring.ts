/**
 * Recurring transactions (rent, EMIs, subscriptions, salary…): a rule that
 * adds the same expense or income once a month on a chosen day. The app
 * creates any occurrences that have come due whenever it loads.
 */
export interface RecurringRule {
  id: string;
  kind: 'expense' | 'income';
  amount: number;
  category: string;
  description: string;
  /** 1–31; months that are shorter use their last day. */
  dayOfMonth: number;
  /** First month it applies to, "YYYY-MM". */
  startMonth: string;
  /** Last month it applies to ("YYYY-MM"), or null for no end. */
  endMonth: string | null;
  /** Paused rules create nothing. */
  active: boolean;
  /** Last month an entry was created for ("YYYY-MM"), or null if never. */
  lastGenerated: string | null;
}

export interface Occurrence {
  monthKey: string;
  date: Date;
}

/** Never back-fill more than this many months in one go. */
export const MAX_CATCH_UP_MONTHS = 24;

export const monthKeyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

/** The rule's date in a given month, clamped to the month's last day; noon avoids time-zone edge cases. */
export function occurrenceDate(year: number, month: number, dayOfMonth: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(1, dayOfMonth), last), 12);
}

const addMonths = (key: string, n: number) => {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month + n, 1);
  return monthKeyOf(d.getFullYear(), d.getMonth());
};

/**
 * Occurrences that should exist by `today` but haven't been created yet:
 * every month after `lastGenerated` (or from `startMonth`) up to now, within
 * `endMonth`, where the day has arrived. Capped to the most recent
 * MAX_CATCH_UP_MONTHS.
 */
export function dueOccurrences(rule: RecurringRule, today: Date): Occurrence[] {
  if (!rule.active || !(rule.amount > 0)) return [];
  let from = rule.lastGenerated ? addMonths(rule.lastGenerated, 1) : rule.startMonth;
  if (from < rule.startMonth) from = rule.startMonth;
  const current = monthKeyOf(today.getFullYear(), today.getMonth());
  const until = rule.endMonth && rule.endMonth < current ? rule.endMonth : current;

  const out: Occurrence[] = [];
  for (let key = from; key <= until; key = addMonths(key, 1)) {
    const { year, month } = parseMonthKey(key);
    const date = occurrenceDate(year, month, rule.dayOfMonth);
    if (date.getTime() > today.getTime()) break;
    out.push({ monthKey: key, date });
  }
  return out.slice(-MAX_CATCH_UP_MONTHS);
}

/** When the rule will next add an entry, or null if it never will again. */
export function nextOccurrence(rule: RecurringRule, today: Date): Date | null {
  if (!rule.active) return null;
  let key = rule.lastGenerated ? addMonths(rule.lastGenerated, 1) : rule.startMonth;
  for (let i = 0; i < 400; i++, key = addMonths(key, 1)) {
    if (rule.endMonth && key > rule.endMonth) return null;
    const { year, month } = parseMonthKey(key);
    const date = occurrenceDate(year, month, rule.dayOfMonth);
    if (date.getTime() > today.getTime()) return date;
  }
  return null;
}

/** Deterministic document id, so two devices creating the same month can't duplicate it. */
export const recurringEntryId = (ruleId: string, monthKey: string) => `rec_${ruleId}_${monthKey}`;

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
