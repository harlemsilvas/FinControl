import { describe, expect, it } from 'vitest';
import { iso, monthRange, shortDate } from './contracts';

describe('intelligence date contracts',()=>{
  it('builds the full calendar month range',()=>{expect(monthRange(new Date(2026,1,10))).toEqual({from:'2026-02-01',to:'2026-02-28'});});
  it('formats ISO dates without timezone drift',()=>{expect(iso(new Date(2026,6,16,12))).toBe('2026-07-16');expect(shortDate('2026-07-16')).toMatch(/16/);});
});
