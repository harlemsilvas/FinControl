import { describe, expect, it } from 'vitest';
import { digitsOnly, formatCnpj, formatCpf, formatPhone, formatPostalCode, toActiveParam } from './input-format';

describe('input-format', () => {
  it('keeps only digits', () => {
    expect(digitsOnly('12.345-6/78')).toBe('12345678');
  });

  it('formats CPF and CNPJ progressively and truncates extra digits', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
    expect(formatCpf('123456789012345')).toBe('123.456.789-01');
    expect(formatCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('formats landline, mobile and partial phones', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone('11')).toBe('(11');
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('formats postal code only after the fifth digit', () => {
    expect(formatPostalCode('01310')).toBe('01310');
    expect(formatPostalCode('01310100')).toBe('01310-100');
  });

  it('maps the active filter to the API parameter', () => {
    expect(toActiveParam('active')).toBe(true);
    expect(toActiveParam('inactive')).toBe(false);
    expect(toActiveParam('all')).toBeUndefined();
  });
});
