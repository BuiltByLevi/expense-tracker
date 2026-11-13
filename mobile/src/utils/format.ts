/**
 * Indian-locale currency formatting, matching the web app's
 * `₹{n.toLocaleString('en-IN')}` convention exactly (lakh/crore grouping).
 *
 * Hermes ships full ICU on Android, so 'en-IN' grouping is available at
 * runtime; the explicit fallback keeps a wrong-but-readable number on any
 * engine built without it rather than throwing inside a render.
 */
export function formatCurrency(amount: number): string {
  try {
    return `₹${amount.toLocaleString('en-IN')}`;
  } catch {
    return `₹${amount}`;
  }
}

/** Signed variant for ledger rows: +₹1,200 / -₹450. */
export function formatSignedCurrency(amount: number, kind: 'credit' | 'debit'): string {
  return `${kind === 'credit' ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
}
