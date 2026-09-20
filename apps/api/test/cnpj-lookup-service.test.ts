import { afterEach, describe, expect, it, vi } from 'vitest';
import { CnpjLookupService } from '../src/domains/master-data/cnpj-lookup-service.js';

afterEach(() => vi.unstubAllGlobals());

describe('CnpjLookupService', () => {
  it('maps public CNPJ data to the supplier form contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      cnpj: '11222333000181', razao_social: 'Fornecedor Teste Ltda', nome_fantasia: 'Fornecedor Teste',
      cep: '80010-000', logradouro: 'Rua das Flores', numero: '123', complemento: 'Galpão 2',
      bairro: 'Centro', municipio: 'Curitiba', uf: 'PR', ddd_telefone_1: '(41) 3333-4444',
      email: 'CONTATO@EXAMPLE.COM', descricao_situacao_cadastral: 'ATIVA',
    }), { status: 200 })));

    const result = await new CnpjLookupService('https://example.test/cnpj').lookup('11.222.333/0001-81');

    expect(result).toMatchObject({ documentNumber: '11222333000181', legalName: 'Fornecedor Teste Ltda',
      postalCode: '80010000', cityName: 'Curitiba', stateCode: 'PR', phone: '4133334444', email: 'contato@example.com' });
  });

  it('rejects an invalid CNPJ without calling the provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(new CnpjLookupService('https://example.test/cnpj').lookup('123')).rejects.toMatchObject({ code: 'INVALID_CNPJ' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
