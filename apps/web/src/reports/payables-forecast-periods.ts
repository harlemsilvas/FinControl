export type ForecastPeriodPreset = 'NEXT_7_DAYS' | 'NEXT_WEEK' | 'THIS_MONTH' | 'NEXT_MONTH' | 'CUSTOM';

function localIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function rangeForForecastPreset(preset: Exclude<ForecastPeriodPreset, 'CUSTOM'>, today = new Date()): { from: string; to: string } {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'NEXT_7_DAYS') return { from: localIso(current), to: localIso(addDays(current, 6)) };
  if (preset === 'NEXT_WEEK') {
    const daysUntilNextMonday = ((8 - current.getDay()) % 7) || 7;
    const nextMonday = addDays(current, daysUntilNextMonday);
    return { from: localIso(nextMonday), to: localIso(addDays(nextMonday, 6)) };
  }
  if (preset === 'THIS_MONTH') return { from: localIso(new Date(current.getFullYear(), current.getMonth(), 1)), to: localIso(new Date(current.getFullYear(), current.getMonth() + 1, 0)) };
  return { from: localIso(new Date(current.getFullYear(), current.getMonth() + 1, 1)), to: localIso(new Date(current.getFullYear(), current.getMonth() + 2, 0)) };
}
