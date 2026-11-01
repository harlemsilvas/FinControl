import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import type { XmlImportInput } from '../payables/payables-repository.js';

// Equivalente no servidor de apps/web/src/payables/xml-import-parser.ts (mesmas regras de datas, parcelas e valores).
const MAX_XML_BYTES = 5 * 1024 * 1024;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false, // mantem CNPJ/numeros como texto (zeros a esquerda)
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name): boolean => name === 'det' || name === 'dup' || name === 'detPag',
});

type Node = Record<string, unknown>;

export class NfeXmlError extends Error {}

const asNode = (value: unknown): Node | undefined => (value && typeof value === 'object' && !Array.isArray(value) ? value as Node : undefined);
const asList = (value: unknown): Node[] => (Array.isArray(value) ? value.map(asNode).filter((item): item is Node => !!item) : []);
const text = (node: Node | undefined, key: string): string | undefined => {
  const value = node?.[key];
  const raw = typeof value === 'string' ? value : asNode(value) && typeof asNode(value)!['#text'] === 'string' ? asNode(value)!['#text'] as string : undefined;
  return raw?.trim() || undefined;
};
const digits = (value?: string): string | undefined => value?.replace(/\D+/g, '') || undefined;
const onlyDate = (value?: string): string | undefined => value?.slice(0, 10) || undefined;
const amount = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

interface Party { legalName?: string; tradeName?: string; documentNumber?: string; stateRegistration?: string; cityName?: string; stateCode?: string; postalCode?: string; street?: string; streetNumber?: string; addressComplement?: string; neighborhood?: string; phone?: string }

function party(node: Node | undefined, addressKey: 'enderEmit' | 'enderDest'): Party {
  const address = asNode(node?.[addressKey]);
  return {
    legalName: text(node, 'xNome'), tradeName: text(node, 'xFant'), documentNumber: digits(text(node, 'CNPJ') ?? text(node, 'CPF')),
    stateRegistration: text(node, 'IE'), cityName: text(address, 'xMun'), stateCode: text(address, 'UF'), postalCode: digits(text(address, 'CEP')),
    street: text(address, 'xLgr'), streetNumber: text(address, 'nro'), addressComplement: text(address, 'xCpl'), neighborhood: text(address, 'xBairro'), phone: digits(text(address, 'fone')),
  };
}

export function parseNfeXml(rawXml: string): XmlImportInput {
  const size = Buffer.byteLength(rawXml, 'utf8');
  if (size > MAX_XML_BYTES) throw new NfeXmlError('XML acima do tamanho permitido');
  if (/<!DOCTYPE|<!ENTITY/i.test(rawXml)) throw new NfeXmlError('XML com DOCTYPE/ENTITY nao e aceito');
  let root: Node;
  try { root = parser.parse(rawXml) as Node; } catch { throw new NfeXmlError('XML invalido'); }

  const proc = asNode(root.nfeProc);
  const nfe = asNode(proc?.NFe) ?? asNode(root.NFe);
  const infNFe = asNode(nfe?.infNFe);
  if (!infNFe) throw new NfeXmlError('infNFe nao encontrado');
  const accessKey = digits(text(infNFe, '@_Id') ?? text(asNode(asNode(proc?.protNFe)?.infProt), 'chNFe'));
  if (!accessKey || !/^\d{44}$/.test(accessKey)) throw new NfeXmlError('Chave NFe invalida');

  const ide = asNode(infNFe.ide);
  const total = asNode(asNode(infNFe.total)?.ICMSTot);
  const emit = party(asNode(infNFe.emit), 'enderEmit');
  const dest = party(asNode(infNFe.dest), 'enderDest');
  const issueDate = onlyDate(text(ide, 'dhEmi')) ?? onlyDate(text(ide, 'dEmi'));
  const installments = asList(asNode(infNFe.cobr)?.dup).map((item, index) => ({
    installmentNumber: Number(text(item, 'nDup')) || index + 1,
    dueDate: onlyDate(text(item, 'dVenc')) ?? issueDate ?? '',
    amount: amount(text(item, 'vDup')) ?? 0,
  })).filter((item) => item.dueDate && item.amount > 0);
  const fallbackDueDate = installments[0]?.dueDate ?? issueDate;
  const invoiceTotalAmount = amount(text(total, 'vNF'));
  const paid = asList(asNode(infNFe.pag)?.detPag).reduce((sum, item) => sum + (amount(text(item, 'vPag')) ?? 0), 0);
  const itemsPreview = asList(infNFe.det).slice(0, 20).map((det) => {
    const prod = asNode(det.prod);
    return { code: text(prod, 'cProd'), description: text(prod, 'xProd'), quantity: text(prod, 'qCom'), amount: amount(text(prod, 'vProd')) };
  });

  return {
    accessKey, rawXml, sourceFileName: `${accessKey}.xml`, sourceMimeType: 'application/xml', sourceSizeBytes: size,
    sourceFileHash: createHash('sha256').update(rawXml).digest('hex'),
    supplierLegalName: emit.legalName, supplierTradeName: emit.tradeName, supplierDocumentNumber: emit.documentNumber,
    supplierStateRegistration: emit.stateRegistration, supplierCityName: emit.cityName, supplierStateCode: emit.stateCode,
    supplierPostalCode: emit.postalCode, supplierStreet: emit.street, supplierStreetNumber: emit.streetNumber,
    supplierAddressComplement: emit.addressComplement, supplierNeighborhood: emit.neighborhood, supplierPhone: emit.phone,
    recipientLegalName: dest.legalName, recipientDocumentNumber: dest.documentNumber, recipientStateRegistration: dest.stateRegistration,
    recipientCityName: dest.cityName, recipientStateCode: dest.stateCode,
    documentModel: text(ide, 'mod'), documentNumber: text(ide, 'nNF'), documentSeries: text(ide, 'serie'),
    issueDate, operationDate: onlyDate(text(ide, 'dhSaiEnt')) ?? onlyDate(text(ide, 'dSaiEnt')), dueDate: fallbackDueDate,
    productsAmount: amount(text(total, 'vProd')), freightAmount: amount(text(total, 'vFrete')), insuranceAmount: amount(text(total, 'vSeg')),
    discountAmount: amount(text(total, 'vDesc')), otherAmount: amount(text(total, 'vOutro')), invoiceTotalAmount,
    paymentAmount: paid || invoiceTotalAmount,
    installments: installments.length ? installments : fallbackDueDate && invoiceTotalAmount ? [{ installmentNumber: 1, dueDate: fallbackDueDate, amount: invoiceTotalAmount }] : [],
    parsedData: { itemsPreview },
  };
}
