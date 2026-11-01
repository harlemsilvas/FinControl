import { describe, expect, it } from 'vitest';
import { isBusinessTime, nextDelaySeconds, type DfeSyncScheduleConfig } from '../src/domains/integrations/dfe-sync-schedule.js';

const config: DfeSyncScheduleConfig = { timeZone: 'America/Sao_Paulo', businessIntervalSeconds: 300, offPeakIntervalSeconds: 1800, businessStartHour: 7, businessEndHour: 18 };
// Sao Paulo = UTC-3 (sem horario de verao). 2026-11-02 e segunda-feira; 2026-11-01, domingo; 2026-11-07, sabado.
const at = (isoLocal: string): Date => new Date(`${isoLocal}-03:00`);

describe('agenda do conector DFe', () => {
  it('usa o intervalo curto em dia util dentro do horario comercial', () => {
    expect(nextDelaySeconds(at('2026-11-02T07:00:00'), config)).toBe(300);
    expect(nextDelaySeconds(at('2026-11-04T12:30:00'), config)).toBe(300);
    expect(nextDelaySeconds(at('2026-11-06T17:59:59'), config)).toBe(300);
  });

  it('usa o intervalo longo antes das 7h, a partir das 18h e no fim de semana', () => {
    expect(nextDelaySeconds(at('2026-11-02T06:59:59'), config)).toBe(1800);
    expect(nextDelaySeconds(at('2026-11-02T18:00:00'), config)).toBe(1800);
    expect(nextDelaySeconds(at('2026-11-01T10:00:00'), config)).toBe(1800);
    expect(nextDelaySeconds(at('2026-11-07T10:00:00'), config)).toBe(1800);
  });

  it('avalia no fuso da empresa, nao no do servidor (UTC)', () => {
    // 21:30 UTC de segunda = 18:30 em Sao Paulo: fora do horario comercial.
    expect(isBusinessTime(new Date('2026-11-02T21:30:00Z'), config)).toBe(false);
    // 10:30 UTC de segunda = 07:30 em Sao Paulo: dentro.
    expect(isBusinessTime(new Date('2026-11-02T10:30:00Z'), config)).toBe(true);
  });
});
