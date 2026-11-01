export interface DfeSyncScheduleConfig {
  timeZone: string;
  businessIntervalSeconds: number;
  offPeakIntervalSeconds: number;
  businessStartHour: number;
  businessEndHour: number;
}

// Horario comercial: segunda a sexta, de businessStartHour (inclusive) ate businessEndHour (exclusive), no fuso da empresa.
// Feriados nao sao tratados: nesses dias vale o intervalo comercial, que e so uma consulta barata.
export function isBusinessTime(now: Date, config: Pick<DfeSyncScheduleConfig, 'timeZone' | 'businessStartHour' | 'businessEndHour'>): boolean {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: config.timeZone, weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  return !['Sat', 'Sun'].includes(weekday) && hour >= config.businessStartHour && hour < config.businessEndHour;
}

export function nextDelaySeconds(now: Date, config: DfeSyncScheduleConfig): number {
  return isBusinessTime(now, config) ? config.businessIntervalSeconds : config.offPeakIntervalSeconds;
}
