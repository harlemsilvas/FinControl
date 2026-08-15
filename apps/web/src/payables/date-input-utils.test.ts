import { describe, expect, it } from 'vitest';
import { coerceIsoDateInput, isFourDigitIsoDate } from './date-input-utils';

describe('date-input-utils', () => {
  it('accepts only complete ISO dates with a four-digit year', () => {
    expect(isFourDigitIsoDate('2026-08-17')).toBe(true);
    expect(isFourDigitIsoDate('666666-08-17')).toBe(false);
    expect(isFourDigitIsoDate('2026-02-31')).toBe(false);
  });

  it('keeps the previous value when the browser emits an overlong year', () => {
    expect(coerceIsoDateInput('2026-08-17', '666666-08-17', { allowEmpty: true })).toBe('2026-08-17');
  });

  it('allows clearing optional date fields', () => {
    expect(coerceIsoDateInput('2027-02-17', '', { allowEmpty: true })).toBe('');
  });
});
