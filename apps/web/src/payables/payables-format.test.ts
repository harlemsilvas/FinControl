import { describe, expect, it } from 'vitest';
import { addDays, datePtBr, recurrenceStatusLabel } from './payables-types';

describe('payables shared helpers', () => {
  it('formats ISO dates as dd/mm/yyyy and falls back to a dash', () => {
    expect(datePtBr('2026-10-31')).toBe('31/10/2026');
    expect(datePtBr('2026-10-31T12:00:00Z')).toBe('31/10/2026');
    expect(datePtBr(null)).toBe('-');
    expect(datePtBr('invalid')).toBe('-');
  });

  it('adds days without mutating the original date', () => {
    const base = new Date(2026, 9, 31);
    expect(addDays(base, 1).getDate()).toBe(1);
    expect(base.getDate()).toBe(31);
  });

  it('labels the recurrence status', () => {
    expect(recurrenceStatusLabel('FINISHED')).toBe('Geração da série concluída');
    expect(recurrenceStatusLabel('CANCELLED')).toBe('Série cancelada');
    expect(recurrenceStatusLabel(undefined)).toBe('Recorrente');
  });
});
