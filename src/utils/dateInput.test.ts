import { describe, it, expect } from 'vitest';
import { parseLocalDateInput } from './dateInput';

describe('parseLocalDateInput', () => {
  it('preserves the exact calendar date regardless of host timezone (never rolls back a day)', () => {
    const d = parseLocalDateInput('2026-11-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(10);
  });

  it('produces local midnight', () => {
    const d = parseLocalDateInput('2026-01-01');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
