import type { PayablesForecastGroup, PayablesForecastItem, PayablesForecastSummary } from '../intelligence/contracts';

export interface PayablesForecastExportInput {
  from: string;
  to: string;
  generatedAt: Date;
  filters: {
    company: string;
    supplier: string;
    category: string;
    status: string;
    search: string;
  };
  summary: PayablesForecastSummary;
  byCompany: PayablesForecastGroup[];
  byDate: PayablesForecastGroup[];
  items: PayablesForecastItem[];
}

const colors = {
  navy: 'FF071126',
  teal: 'FF0F766E',
  tealLight: 'FFCCFBF1',
  blueLight: 'FFEFF6FF',
  redLight: 'FFFEF2F2',
  slate: 'FF475569',
  slateLight: 'FFF1F5F9',
  white: 'FFFFFFFF',
};

function datePtBr(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function safeText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function buildPayablesForecastWorkbook(input: PayablesForecastExportInput): Promise<Uint8Array> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'FinControl';
  workbook.created = input.generatedAt;
  workbook.modified = input.generatedAt;
  workbook.subject = 'Relatório de compromissos a pagar';
  workbook.title = 'Compromissos a pagar';

  const summary = workbook.addWorksheet('Resumo', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  summary.columns = [
    { key: 'a', width: 25 }, { key: 'b', width: 23 }, { key: 'c', width: 4 },
    { key: 'd', width: 25 }, { key: 'e', width: 23 }, { key: 'f', width: 16 },
  ];
  summary.mergeCells('A1:F1');
  summary.getCell('A1').value = 'FINCONTROL · COMPROMISSOS A PAGAR';
  summary.getCell('A1').font = { bold: true, size: 18, color: { argb: colors.white } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } };
  summary.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  summary.getRow(1).height = 34;
  summary.mergeCells('A2:F2');
  summary.getCell('A2').value = `Período: ${datePtBr(input.from)} a ${datePtBr(input.to)} · Gerado em ${input.generatedAt.toLocaleString('pt-BR')}`;
  summary.getCell('A2').font = { color: { argb: colors.slate }, italic: true };

  summary.getCell('A4').value = 'FILTROS APLICADOS';
  summary.getCell('A4').font = { bold: true, color: { argb: colors.teal } };
  const filterRows: Array<[string, string, string, string]> = [
    ['Empresa', input.filters.company, 'Fornecedor', input.filters.supplier],
    ['Categoria', input.filters.category, 'Situação', input.filters.status],
    ['Busca', input.filters.search || 'Sem busca textual', '', ''],
  ];
  filterRows.forEach((values, index) => {
    const row = summary.getRow(5 + index);
    row.values = [values[0], safeText(values[1]), '', values[2], safeText(values[3])];
    row.getCell(1).font = { bold: true, color: { argb: colors.slate } };
    row.getCell(4).font = { bold: true, color: { argb: colors.slate } };
  });

  const metrics = [
    ['Total pendente', Number(input.summary.totalPending), colors.navy, colors.white],
    ['Vencido no período', Number(input.summary.overdue), colors.redLight, 'FFB91C1C'],
    ['A vencer', Number(input.summary.upcoming), colors.blueLight, 'FF0369A1'],
    ['Parcelas', Number(input.summary.installmentCount), colors.tealLight, colors.teal],
  ];
  metrics.forEach(([label, value, background, foreground], index) => {
    const column = index + 1;
    const labelCell = summary.getCell(10, column);
    const valueCell = summary.getCell(11, column);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { bold: true, color: { argb: String(foreground) } };
    valueCell.font = { bold: true, size: 16, color: { argb: String(foreground) } };
    labelCell.fill = valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: String(background) } };
    labelCell.alignment = valueCell.alignment = { horizontal: 'center' };
    if (index < 3) valueCell.numFmt = '"R$" #,##0.00';
  });
  summary.getCell('F10').value = 'Empresas';
  summary.getCell('F11').value = Number(input.summary.companyCount);
  summary.getCell('F10').font = { bold: true, color: { argb: colors.teal } };
  summary.getCell('F11').font = { bold: true, size: 16, color: { argb: colors.teal } };
  summary.getCell('F10').alignment = summary.getCell('F11').alignment = { horizontal: 'center' };
  summary.getCell('F10').fill = summary.getCell('F11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.tealLight } };

  const groupHeader = (rowNumber: number, fromCell: string, toCell: string, title: string): void => {
    summary.mergeCells(`${fromCell}${rowNumber}:${toCell}${rowNumber}`);
    const cell = summary.getCell(`${fromCell}${rowNumber}`);
    cell.value = title;
    cell.font = { bold: true, color: { argb: colors.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.teal } };
  };
  groupHeader(14, 'A', 'B', 'POR EMPRESA');
  groupHeader(14, 'D', 'F', 'POR VENCIMENTO');
  const groupLength = Math.max(input.byCompany.length, input.byDate.length);
  for (let index = 0; index < groupLength; index += 1) {
    const row = 15 + index;
    const company = input.byCompany[index];
    const date = input.byDate[index];
    if (company) {
      summary.getCell(row, 1).value = safeText(company.label);
      summary.getCell(row, 2).value = Number(company.amount);
      summary.getCell(row, 2).numFmt = '"R$" #,##0.00';
    }
    if (date) {
      summary.getCell(row, 4).value = datePtBr(date.label);
      summary.getCell(row, 5).value = Number(date.amount);
      summary.getCell(row, 5).numFmt = '"R$" #,##0.00';
      summary.getCell(row, 6).value = `${date.count} parcela(s)`;
    }
    if (index % 2 === 1) summary.getRow(row).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.slateLight } };
  }

  const details = workbook.addWorksheet('Detalhamento', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    headerFooter: { oddFooter: 'FinControl · Página &P de &N' },
  });
  details.columns = [
    { key: 'dueDate', width: 14 }, { key: 'company', width: 25 }, { key: 'supplier', width: 34 },
    { key: 'document', width: 20 }, { key: 'installment', width: 12 }, { key: 'category', width: 24 },
    { key: 'balance', width: 17 }, { key: 'status', width: 15 },
  ];
  details.mergeCells('A1:H1');
  details.getCell('A1').value = 'FINCONTROL · DETALHAMENTO DOS COMPROMISSOS';
  details.getCell('A1').font = { bold: true, size: 16, color: { argb: colors.white } };
  details.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } };
  details.getRow(1).height = 32;
  details.mergeCells('A2:H2');
  details.getCell('A2').value = `Período: ${datePtBr(input.from)} a ${datePtBr(input.to)} · Empresa: ${input.filters.company} · Situação: ${input.filters.status}`;
  details.getCell('A2').font = { italic: true, color: { argb: colors.slate } };
  details.mergeCells('A3:H3');
  details.getCell('A3').value = `Fornecedor: ${input.filters.supplier} · Categoria: ${input.filters.category} · Busca: ${input.filters.search || 'Sem busca textual'}`;
  details.getCell('A3').font = { italic: true, color: { argb: colors.slate } };
  const header = details.getRow(5);
  header.values = ['Vencimento', 'Empresa', 'Fornecedor', 'Documento', 'Parcela', 'Categoria', 'Saldo em aberto', 'Situação'];
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: colors.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.teal } };
    cell.alignment = { vertical: 'middle' };
  });
  header.height = 24;

  input.items.forEach((item, index) => {
    const row = details.addRow({
      dueDate: datePtBr(item.dueDate), company: safeText(item.companyName), supplier: safeText(item.supplierName),
      document: safeText(item.documentNumber), installment: `${item.installmentNumber}/${item.installmentCount}`,
      category: safeText(item.categoryName), balance: Number(item.openBalance), status: item.status === 'OVERDUE' ? 'Vencido' : item.status === 'TODAY' ? 'Vence hoje' : 'A vencer',
    });
    row.getCell(7).numFmt = '"R$" #,##0.00';
    if (index % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.slateLight } };
  });
  details.autoFilter = { from: 'A5', to: 'H5' };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
