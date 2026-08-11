import { describe, expect, it } from 'vitest';
import { calculateTitleTotal, payableTabs, payableWireframe } from './payable-form-contract';

describe('payables form contract',()=>{
  it('keeps the simplified tab structure for manual payables',()=>{expect(payableTabs).toEqual(['Dados da Conta','Parcelas','Anexos','Observações']);});
  it('does not place payment, recurrence, project, bank account or cost center on the first page',()=>{expect(payableWireframe.primary).not.toContain('defaultPaymentMethodId');expect(payableWireframe.primary).not.toContain('occurrenceType');expect(payableWireframe.primary).not.toContain('projectId');expect(payableWireframe.primary).not.toContain('bankAccountId');expect(payableWireframe.primary).not.toContain('costCenterId');expect(payableWireframe.observations).toContain('costCenterId');});
  it('calculates the read-only title total',()=>{expect(calculateTitleTotal(1000,75,25)).toBe(950);});
});
