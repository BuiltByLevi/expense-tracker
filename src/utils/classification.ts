import type { ExpenseCategory, IncomeCategory } from '../types';

// Keyword -> category rules, checked against the uppercased narration.
// Order matters: more specific merchant/keyword rules are listed before the
// generic fallbacks (NEFT/IMPS/RTGS -> Transfers) so a specific match wins.
const CATEGORY_RULES: { pattern: RegExp; category: ExpenseCategory }[] = [
  { pattern: /SWIGGY|ZOMATO|EATSURE|DOMINOS|RESTAURANT|CAFE/, category: 'Food & Dining' },
  { pattern: /BIGBASKET|BLINKIT|ZEPTO|DMART|GROFERS|GROCERY|GROCERIES/, category: 'Groceries' },
  { pattern: /UBER|OLA|RAPIDO|IRCTC|METRO\s*RAIL|BUS\s*TICKET/, category: 'Transportation' },
  { pattern: /HPCL|BPCL|IOCL|INDIAN\s*OIL|SHELL|PETROL|DIESEL|FUEL/, category: 'Fuel' },
  { pattern: /AMAZON|FLIPKART|MYNTRA|AJIO|SHOPPING/, category: 'Shopping' },
  { pattern: /NETFLIX|PRIME\s*VIDEO|HOTSTAR|SPOTIFY|BOOKMYSHOW|PVR|INOX/, category: 'Entertainment' },
  { pattern: /ELECTRICITY|WATER\s*BILL|GAS\s*BILL|BROADBAND|MOBILE\s*RECHARGE|DTH|WIFI/, category: 'Bills & Utilities' },
  { pattern: /HOSPITAL|PHARMACY|CLINIC|MEDICAL|APOLLO|DIAGNOSTIC/, category: 'Healthcare' },
  { pattern: /SCHOOL|COLLEGE|TUITION|UNIVERSITY|EDUCATION/, category: 'Education' },
  { pattern: /\bRENT\b|LANDLORD/, category: 'Rent' },
  { pattern: /\bEMI\b|LOAN\s*(EMI|REPAYMENT)|ECS\s*(DR|DEBIT)/, category: 'EMI & Loans' },
  { pattern: /\bLIC\b|INSURANCE|PREMIUM/, category: 'Insurance' },
  { pattern: /MUTUAL\s*FUND|\bSIP\b|ZERODHA|GROWW|UPSTOX|STOCK|SHARES|DEMAT/, category: 'Investments' },
  { pattern: /ATM\s*(CASH|WDL|WITHDRAWAL)|CASH\s*WITHDRAWAL/, category: 'Cash Withdrawal' },
  { pattern: /\b(AMB|MIN\s*BAL)\b.*CHARGE|SERVICE\s*CHARGE|BANK\s*CHARGE|PENALTY|LATE\s*FEE/, category: 'Bank Charges' },
  { pattern: /\bNEFT\b|\bIMPS\b|\bRTGS\b|FUND\s*TRANSFER|TRANSFER\s*TO|TRANSFER\s*FROM/, category: 'Transfers' },
];

const SALARY_PATTERN = /\bSALARY\b|\bPAYROLL\b|\bSAL\b/;
const INTEREST_PATTERN = /\bINT\.?\s*PD\b|INTEREST\s*(CREDIT|PAID|EARNED)?/;
const REFUND_PATTERN = /REFUND|REVERSAL|REVERSED|CASHBACK/;
const TRANSFER_IN_PATTERN = /\bNEFT\b|\bIMPS\b|\bRTGS\b|FUND\s*TRANSFER|TRANSFER\s*FROM/;

export interface CategorySuggestion<T extends string = ExpenseCategory> {
  category: T;
  uncertain: boolean;
}

export function suggestCategory(narration: string): CategorySuggestion {
  const upper = narration.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(upper)) {
      return { category: rule.category, uncertain: false };
    }
  }
  // No specific rule matched — default bucket, flagged for the mandatory
  // review step rather than silently guessed as something specific.
  return { category: 'Other', uncertain: true };
}

/** Narration-based salary heuristic for credit rows. */
export function isSalaryCandidate(narration: string): boolean {
  return SALARY_PATTERN.test(narration.toUpperCase());
}

/** Category suggestion for credit (income) transactions — same spirit as
 *  suggestCategory: specific rules first, unmatched narrations fall back to
 *  "Other Income" flagged uncertain for the mandatory review step. */
export function suggestIncomeCategory(narration: string): CategorySuggestion<IncomeCategory> {
  const upper = narration.toUpperCase();
  if (SALARY_PATTERN.test(upper)) return { category: 'Salary', uncertain: false };
  if (INTEREST_PATTERN.test(upper)) return { category: 'Interest', uncertain: false };
  if (REFUND_PATTERN.test(upper)) return { category: 'Refund', uncertain: false };
  if (TRANSFER_IN_PATTERN.test(upper)) return { category: 'Transfer', uncertain: true };
  return { category: 'Other Income', uncertain: true };
}

/** Best-effort employer/source name pulled from a salary narration, e.g.
 *  "NEFT SALARY ABC TECHNOLOGIES" -> "ABC TECHNOLOGIES". Returns null if
 *  nothing beyond the salary keyword itself is present. */
export function extractSalarySource(narration: string): string | null {
  const match = narration.toUpperCase().match(/\b(?:SALARY|PAYROLL|SAL)\b[-\s/]*(.+)/);
  const rest = match?.[1]?.trim();
  return rest && rest.length > 1 ? rest : null;
}
