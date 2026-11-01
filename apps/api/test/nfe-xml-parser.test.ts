import { describe, expect, it } from 'vitest';
import { NfeXmlError, parseNfeXml } from '../src/domains/integrations/nfe-xml-parser.js';

const KEY = '35261011222333000181550010000001231000000019';
const xml = (extra = ''): string => `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${KEY}" versao="4.00">
<ide><mod>55</mod><serie>1</serie><nNF>123</nNF><dhEmi>2026-10-08T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>11222333000181</CNPJ><xNome>Fornecedor &amp; Cia Ltda</xNome><xFant>Forn</xFant><IE>123</IE>
<enderEmit><xLgr>Rua A</xLgr><nro>10</nro><xMun>Curitiba</xMun><UF>PR</UF><CEP>80010000</CEP><fone>4133334444</fone></enderEmit></emit>
<dest><CNPJ>00123456000190</CNPJ><xNome>Empresa Destino</xNome><enderDest><xMun>Maringa</xMun><UF>PR</UF></enderDest></dest>
<det nItem="1"><prod><cProd>A1</cProd><xProd>Item um</xProd><qCom>2.0000</qCom><vProd>60.00</vProd></prod></det>
<det nItem="2"><prod><cProd>B2</cProd><xProd>Item dois</xProd><qCom>1.0000</qCom><vProd>40.00</vProd></prod></det>
<total><ICMSTot><vProd>100.00</vProd><vFrete>5.50</vFrete><vNF>105.50</vNF></ICMSTot></total>
${extra}</infNFe></NFe><protNFe><infProt><chNFe>${KEY}</chNFe></infProt></protNFe></nfeProc>`;

describe('parseNfeXml (servidor)', () => {
  it('extrai chave, partes, valores e preserva zeros a esquerda do CNPJ', () => {
    const input = parseNfeXml(xml());
    expect(input).toMatchObject({
      accessKey: KEY, supplierDocumentNumber: '11222333000181', supplierLegalName: 'Fornecedor & Cia Ltda',
      supplierStateCode: 'PR', supplierPostalCode: '80010000', recipientDocumentNumber: '00123456000190',
      documentModel: '55', documentNumber: '123', documentSeries: '1', issueDate: '2026-10-08',
      productsAmount: 100, freightAmount: 5.5, invoiceTotalAmount: 105.5, paymentAmount: 105.5,
      sourceFileName: `${KEY}.xml`, sourceMimeType: 'application/xml',
    });
    expect(input.sourceFileHash).toMatch(/^[0-9a-f]{64}$/);
    expect(input.parsedData).toEqual({ itemsPreview: [
      { code: 'A1', description: 'Item um', quantity: '2.0000', amount: 60 },
      { code: 'B2', description: 'Item dois', quantity: '1.0000', amount: 40 },
    ] });
  });

  it('sem cobranca usa uma parcela unica na data de emissao', () => {
    expect(parseNfeXml(xml()).installments).toEqual([{ installmentNumber: 1, dueDate: '2026-10-08', amount: 105.5 }]);
  });

  it('usa as duplicatas da cobranca e soma os pagamentos', () => {
    const input = parseNfeXml(xml('<cobr><dup><nDup>001</nDup><dVenc>2026-11-10</dVenc><vDup>50.00</vDup></dup><dup><nDup>002</nDup><dVenc>2026-12-10</dVenc><vDup>55.50</vDup></dup></cobr><pag><detPag><vPag>105.50</vPag></detPag></pag>'));
    expect(input.installments).toEqual([
      { installmentNumber: 1, dueDate: '2026-11-10', amount: 50 },
      { installmentNumber: 2, dueDate: '2026-12-10', amount: 55.5 },
    ]);
    expect(input.dueDate).toBe('2026-11-10');
    expect(input.paymentAmount).toBe(105.5);
  });

  it('rejeita DOCTYPE/ENTITY, XML sem NFe, chave invalida e XML grande demais', () => {
    expect(() => parseNfeXml(`<!DOCTYPE a [<!ENTITY x "y">]>${xml()}`)).toThrow(NfeXmlError);
    expect(() => parseNfeXml('<qualquer><coisa/></qualquer>')).toThrow(NfeXmlError);
    expect(() => parseNfeXml(xml().replace(`Id="NFe${KEY}"`, 'Id="NFe123"').replace(`<chNFe>${KEY}</chNFe>`, ''))).toThrow('Chave NFe invalida');
    expect(() => parseNfeXml('<a>' + 'x'.repeat(5 * 1024 * 1024) + '</a>')).toThrow('tamanho');
  });
});
