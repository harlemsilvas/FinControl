import { describe, expect, it } from 'vitest';
import { parseNfeXml } from './xml-import-parser';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35260712345678000190550010000012341000012345">
      <ide><mod>55</mod><serie>1</serie><nNF>1234</nNF><dhEmi>2026-07-19T10:00:00-03:00</dhEmi></ide>
      <emit><CNPJ>11222333000181</CNPJ><xNome>Fornecedor Teste Ltda</xNome><xFant>Fornecedor Teste</xFant><IE>123456789</IE><enderEmit><xMun>Curitiba</xMun><UF>PR</UF></enderEmit></emit>
      <dest><CNPJ>12345678000190</CNPJ><xNome>HRM Motos Matriz</xNome><IE>987654321</IE><enderDest><xMun>São Paulo</xMun><UF>SP</UF></enderDest></dest>
      <det nItem="1"><prod><cProd>P001</cProd><xProd>Peça teste</xProd><qCom>2.0000</qCom><vProd>150.00</vProd></prod></det>
      <total><ICMSTot><vProd>150.00</vProd><vFrete>20.00</vFrete><vSeg>0.00</vSeg><vDesc>10.00</vDesc><vOutro>0.00</vOutro><vNF>160.00</vNF></ICMSTot></total>
      <cobr><dup><nDup>1</nDup><dVenc>2026-08-10</dVenc><vDup>160.00</vDup></dup></cobr>
      <pag><detPag><tPag>15</tPag><vPag>160.00</vPag></detPag></pag>
    </infNFe>
  </NFe>
</nfeProc>`;

describe('parseNfeXml', () => {
  it('extracts access key, parties, totals, due dates and items preview', () => {
    const parsed = parseNfeXml(xml);

    expect(parsed.accessKey).toBe('35260712345678000190550010000012341000012345');
    expect(parsed.supplier.documentNumber).toBe('11222333000181');
    expect(parsed.recipient.documentNumber).toBe('12345678000190');
    expect(parsed.documentNumber).toBe('1234');
    expect(parsed.freightAmount).toBe(20);
    expect(parsed.invoiceTotalAmount).toBe(160);
    expect(parsed.installments).toEqual([{ installmentNumber: 1, dueDate: '2026-08-10', amount: 160, paymentMethodRaw: undefined }]);
    expect(parsed.items[0]).toMatchObject({ code: 'P001', description: 'Peça teste', quantity: '2.0000', amount: 150 });
  });
});