// NFe XML parsing helpers kept outside React components to preserve Fast Refresh.
export interface PartyInfo {
  legalName?: string;
  tradeName?: string;
  documentNumber?: string;
  stateRegistration?: string;
  cityName?: string;
  stateCode?: string;
}

export interface XmlInstallmentPreview {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paymentMethodRaw?: string | null;
}

export interface XmlItemPreview {
  code?: string;
  description?: string;
  quantity?: string;
  amount?: number;
}

export interface ParsedNfeXml {
  rawXml: string;
  accessKey: string;
  supplier: PartyInfo;
  recipient: PartyInfo;
  documentModel?: string;
  documentNumber?: string;
  documentSeries?: string;
  issueDate?: string;
  operationDate?: string;
  dueDate?: string;
  productsAmount?: number;
  freightAmount?: number;
  insuranceAmount?: number;
  discountAmount?: number;
  otherAmount?: number;
  invoiceTotalAmount?: number;
  paymentAmount?: number;
  installments: XmlInstallmentPreview[];
  items: XmlItemPreview[];
}

export function digitsOnly(value?: string): string {
  return (value ?? '').replace(/\D+/g, '');
}

function onlyDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function numberFromXml(value?: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) ? number : undefined;
}

function children(element: Element, localName: string): Element[] {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function firstDescendant(element: Element | Document, localName: string): Element | undefined {
  return Array.from(element.getElementsByTagName('*')).find((child) => child.localName === localName);
}

function textOf(element: Element | Document | undefined, localName: string): string | undefined {
  if (!element) return undefined;
  const found = firstDescendant(element, localName);
  const text = found?.textContent?.trim();
  return text || undefined;
}

function partyFrom(element: Element | undefined, addressTag: 'enderEmit' | 'enderDest'): PartyInfo {
  const address = element ? firstDescendant(element, addressTag) : undefined;

  return {
    legalName: textOf(element, 'xNome'),
    tradeName: textOf(element, 'xFant'),
    documentNumber: digitsOnly(textOf(element, 'CNPJ') ?? textOf(element, 'CPF')) || undefined,
    stateRegistration: textOf(element, 'IE'),
    cityName: textOf(address, 'xMun'),
    stateCode: textOf(address, 'UF'),
  };
}

export function parseNfeXml(rawXml: string): ParsedNfeXml {
  const document = new DOMParser().parseFromString(rawXml, 'application/xml');
  const parserError = firstDescendant(document, 'parsererror');
  if (parserError) throw new Error('XML inválido. Verifique o arquivo selecionado.');

  const infNFe = firstDescendant(document, 'infNFe');
  const accessKey = digitsOnly(infNFe?.getAttribute('Id') ?? textOf(document, 'chNFe'));
  if (!/^\d{44}$/.test(accessKey)) throw new Error('Não foi possível localizar uma chave NFe válida com 44 dígitos.');

  const emit = firstDescendant(document, 'emit');
  const dest = firstDescendant(document, 'dest');
  const total = firstDescendant(document, 'ICMSTot');
  const ide = firstDescendant(document, 'ide');
  const duplicates = firstDescendant(document, 'cobr') ? children(firstDescendant(document, 'cobr')!, 'dup') : [];
  const payments = firstDescendant(document, 'pag') ? children(firstDescendant(document, 'pag')!, 'detPag') : [];
  const paymentAmount = payments.reduce((sum, item) => sum + (numberFromXml(textOf(item, 'vPag')) ?? 0), 0);
  const installments = duplicates.map((item, index) => ({
    installmentNumber: Number(textOf(item, 'nDup')) || index + 1,
    dueDate: onlyDate(textOf(item, 'dVenc')) ?? onlyDate(textOf(ide, 'dhEmi')) ?? onlyDate(textOf(ide, 'dEmi')) ?? '',
    amount: numberFromXml(textOf(item, 'vDup')) ?? 0,
    paymentMethodRaw: undefined,
  })).filter((item) => item.dueDate && item.amount > 0);
  const fallbackDueDate = installments[0]?.dueDate ?? onlyDate(textOf(ide, 'dhEmi')) ?? onlyDate(textOf(ide, 'dEmi'));
  const invoiceTotalAmount = numberFromXml(textOf(total, 'vNF'));

  const items = Array.from(document.getElementsByTagName('*'))
    .filter((item) => item.localName === 'det')
    .slice(0, 20)
    .map((det) => {
      const prod = firstDescendant(det, 'prod');
      return {
        code: textOf(prod, 'cProd'),
        description: textOf(prod, 'xProd'),
        quantity: textOf(prod, 'qCom'),
        amount: numberFromXml(textOf(prod, 'vProd')),
      };
    });

  return {
    rawXml,
    accessKey,
    supplier: partyFrom(emit, 'enderEmit'),
    recipient: partyFrom(dest, 'enderDest'),
    documentModel: textOf(ide, 'mod'),
    documentNumber: textOf(ide, 'nNF'),
    documentSeries: textOf(ide, 'serie'),
    issueDate: onlyDate(textOf(ide, 'dhEmi')) ?? onlyDate(textOf(ide, 'dEmi')),
    operationDate: onlyDate(textOf(ide, 'dhSaiEnt')) ?? onlyDate(textOf(ide, 'dSaiEnt')),
    dueDate: fallbackDueDate,
    productsAmount: numberFromXml(textOf(total, 'vProd')),
    freightAmount: numberFromXml(textOf(total, 'vFrete')),
    insuranceAmount: numberFromXml(textOf(total, 'vSeg')),
    discountAmount: numberFromXml(textOf(total, 'vDesc')),
    otherAmount: numberFromXml(textOf(total, 'vOutro')),
    invoiceTotalAmount,
    paymentAmount: paymentAmount || invoiceTotalAmount,
    installments: installments.length ? installments : fallbackDueDate && invoiceTotalAmount ? [{ installmentNumber: 1, dueDate: fallbackDueDate, amount: invoiceTotalAmount }] : [],
    items,
  };
}

