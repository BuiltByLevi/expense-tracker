import type { ExpenseCategory, IncomeCategory } from './types';

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
  { pattern: /\bEMI\b|\bLOAN\b|ECS\s*(DR|DEBIT)|\bNACH\b|ACH\s*D(R|EBIT)?\b/, category: 'EMI & Loans' },
  { pattern: /\bLIC\b|INSURANCE|PREMIUM/, category: 'Insurance' },
  { pattern: /MUTUAL\s*FUND|\bSIP\b|ZERODHA|GROWW|UPSTOX|STOCK|SHARES|DEMAT/, category: 'Investments' },
  { pattern: /\bATM\b|\bATW\b|\bNWD\b|\bAWL\b|CASH\s*(WDL|WITHDRAWAL)/, category: 'Cash Withdrawal' },
  { pattern: /\b(AMB|MIN\s*BAL)\b.*CHARGE|SERVICE\s*CHARGE|BANK\s*CHARGE|PENALTY|LATE\s*FEE|(SMS|ANNUAL|MAINTENANCE|DEBIT\s*CARD|CH(E)?Q(UE)?\s*BOOK)\s*(ALERT\s*)?(CHARGES?|CHRGS?|CHGS?|FEES?)/, category: 'Bank Charges' },
  // Only explicitly internal movements are Transfers. A bare NEFT/IMPS/RTGS
  // payment could be a vendor or a family member, so it falls through to
  // 'Other' (flagged for review) and keeps counting as spending.
  { pattern: /INTERNAL\s*TRANSFER|SELF\s*TRANSFER|\bOWN\s*(A\/?C|ACCOUNT)\b|\bSWEEP\b/, category: 'Transfers' },
];

const SALARY_PATTERN = /\bSALARY\b|\bPAYROLL\b|\bSAL\b/;
const INTEREST_PATTERN = /\bINT\.?\s*PD\b|INTEREST\s*(CREDIT|PAID|EARNED)?/;
const REFUND_PATTERN = /REFUND|REVERSAL|REVERSED|CASHBACK/;
// Payment-gateway and marketplace payouts (Razorpay, Payload, ...) are money
// earned. They are matched BEFORE the transfer rule because they almost
// always arrive over NEFT/IMPS — "NEFT-N3012345-RAZORPAY SOFTWARE PVT LTD" —
// and the bare rail name used to file them under Transfer, which is excluded
// from Monthly Earnings.
const EARNED_PAYOUT_PATTERN = /RAZORPAY|\bRZPX\b|PAYLOAD|CASHFREE|\bPAYU\b|INSTAMOJO|\bSTRIPE\b|PAYPAL|SETTLEMENT|\bPAYOUT\b/;
// Incoming money that the statement itself says is between the user's own
// accounts. Bare NEFT/IMPS/RTGS credits are NOT in this list: their sender
// is unknown, so they stay unassigned until the user classifies them.
const INTERNAL_TRANSFER_IN_PATTERN = /INTERNAL\s*TRANSFER|SELF\s*TRANSFER|\bOWN\s*(A\/?C|ACCOUNT)\b|\bSWEEP\b/;

export interface CategorySuggestion<T extends string = ExpenseCategory> {
  /** null = no confident category: the row needs the user's classification. */
  category: T | null;
  uncertain: boolean;
}

export function suggestCategory(narration: string): { category: ExpenseCategory; uncertain: boolean } {
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

/** Category suggestion for credit (income) transactions. Specific rules
 *  come first. An unrecognized credit gets NO category (null, flagged): it is
 *  never assumed to be income, a transfer or a refund — the user decides.
 *  Gateway payouts keep their suggested "Other Income" but stay flagged. */
export function suggestIncomeCategory(narration: string): CategorySuggestion<IncomeCategory> {
  const upper = narration.toUpperCase();
  if (SALARY_PATTERN.test(upper)) return { category: 'Salary', uncertain: false };
  if (INTEREST_PATTERN.test(upper)) return { category: 'Interest', uncertain: false };
  if (REFUND_PATTERN.test(upper)) return { category: 'Refund', uncertain: false };
  // A suggestion only: an own-account narration is never finalised on its own.
  // The user confirms it (or picks another category) before it is imported.
  if (INTERNAL_TRANSFER_IN_PATTERN.test(upper)) return { category: 'Transfer', uncertain: true };
  if (EARNED_PAYOUT_PATTERN.test(upper)) return { category: 'Other Income', uncertain: true };
  return { category: null, uncertain: true };
}

/** Best-effort employer/source name pulled from a salary narration, e.g.
 *  "NEFT SALARY ABC TECHNOLOGIES" -> "ABC TECHNOLOGIES". Returns null if
 *  nothing beyond the salary keyword itself is present. */
export function extractSalarySource(narration: string): string | null {
  const match = narration.toUpperCase().match(/\b(?:SALARY|PAYROLL|SAL)\b[-\s/]*(.+)/);
  const rest = match?.[1]?.trim();
  return rest && rest.length > 1 ? rest : null;
}
