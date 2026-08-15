const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OVERLONG_ISO_YEAR_PATTERN = /^\d{5,}-\d{2}-\d{2}$/;

export const MIN_ISO_DATE = '1900-01-01';
export const MAX_ISO_DATE = '9999-12-31';

export function isFourDigitIsoDate(value?: string | null): boolean {
  if (!ISO_DATE_PATTERN.test(value ?? '')) return false;
  const parts = value!.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year == null || month == null || day == null) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function coerceIsoDateInput(previousValue: string, nextValue: string, options: { allowEmpty?: boolean } = {}): string {
  if (nextValue === '') return options.allowEmpty ? '' : previousValue;
  if (OVERLONG_ISO_YEAR_PATTERN.test(nextValue)) return previousValue;
  return isFourDigitIsoDate(nextValue) ? nextValue : previousValue;
}
