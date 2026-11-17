/** Rupees -> whole paise. Money is summed in paise so totals never pick up
 *  binary floating-point drift (0.1 + 0.2 !== 0.3). */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

/** Rounds a rupee amount to exact paise. */
export const roundMoney = (rupees: number): number => toPaise(rupees) / 100;

/** Exact sum of rupee amounts. */
export function sumMoney(amounts: Iterable<number>): number {
  let paise = 0;
  for (const amount of amounts) paise += toPaise(amount);
  return paise / 100;
}
