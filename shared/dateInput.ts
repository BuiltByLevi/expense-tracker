/**
 * Parses a `yyyy-MM-dd` value from an `<input type="date">` into a Date
 * representing LOCAL midnight on that day.
 *
 * `new Date('yyyy-MM-dd')` parses the string as UTC midnight (per the ES spec
 * for date-only ISO strings). In any timezone behind UTC, reading that value
 * back via the local getters (`getFullYear`/`getMonth`/`getDate` — used
 * everywhere in this app for month bucketing) rolls it back to the previous
 * calendar day. Building the Date from its y/m/d parts directly avoids the
 * UTC round-trip entirely, so the stored date always matches what the user
 * picked regardless of timezone.
 */
export function parseLocalDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
