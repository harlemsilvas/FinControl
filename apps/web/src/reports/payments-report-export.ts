import type { PaymentsReportResponse } from '../intelligence/contracts';

function safe(value: string): string { return /^[=+\-@]/.test(value) ? `'${value}` : value; }
function date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }

export async function buildPaymentsReportWorkbook(input: {
  from: string; to: string; generatedAt: Date; company: string; supplier: string; category: string; search: string;
  report: PaymentsReportResponse; items: PaymentsReportResponse['data'];
}): Promise<Uint8Array> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'FinControl';
  workbook.created = input.generatedAt;
  workbook.title = 'Pagamentos realizados';
  const summary = workbook.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 28 }, { width: 30 }, { width: 28 }, { width: 30 }];
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'FINCONTROL · PAGAMENTOS REALIZADOS';
  summary.getCell('A1').font = { bold: true, size: 17, color: { argb: 'FFFFFFFF' } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071126' } };
  summary.getRow(1).height = 32;
  summary.addRow([`Data do pagamento: ${date(input.from)} a ${date(input.to)}`]);
  summary.addRow([`Gerado em: ${input.generatedAt.toLocaleString('pt-BR')}`]);
  summary.addRow(['Empresa', safe(input.company), 'Fornecedor', safe(input.supplier)]);
  summary.addRow(['Categoria', safe(input.category), 'Busca', safe(input.search || 'Sem busca textual')]);
  summary.addRow([]);
  const metrics = [
    ['Total pago', input.report.summary.totalPaid],
    ['Principal', input.report.summary.totalPrincipal],
    ['Ajustes líquidos', input.report.summary.totalAdjustments],
    ['Pagamentos', input.report.summary.paymentCount],
    ['Empresas', input.report.summary.companyCount],
  ];
  metrics.forEach(([label, value], index) => {
    const row = summary.getRow(7 + index);
    row.values = [label, Number(value)];
    row.getCell(1).font = { bold: true, color: { argb: 'FF0F766E' } };
    if (index < 3) row.getCell(2).numFmt = '"R$" #,##0.00';
  });
  const groups = workbook.addWorksheet('Por empresa e data', { views: [{ showGridLines: false }] });
  groups.columns = [{ width: 28 }, { width: 18 }, { width: 15 }, { width: 4 }, { width: 18 }, { width: 18 }, { width: 15 }];
  groups.addRow(['Empresa', 'Valor', 'Pagamentos', '', 'Data do pagamento', 'Valor', 'Pagamentos']);
  for (let index = 0; index < Math.max(input.report.byCompany.length, input.report.byDate.length); index += 1) {
    const company = input.report.byCompany[index];
    const day = input.report.byDate[index];
    const row = groups.addRow([company ? safe(company.label) : '', company ? Number(company.amount) : '', company?.count ?? '', '', day ? date(day.label) : '', day ? Number(day.amount) : '', day?.count ?? '']);
    row.getCell(2).numFmt = row.getCell(6).numFmt = '"R$" #,##0.00';
  }
  const details = workbook.addWorksheet('Detalhamento', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  details.columns = [
    { width: 16 }, { width: 26 }, { width: 32 }, { width: 21 }, { width: 12 }, { width: 23 },
    { width: 24 }, { width: 24 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
  ];
  details.mergeCells('A1:M1');
  details.getCell('A1').value = 'FINCONTROL · DETALHAMENTO DOS PAGAMENTOS';
  details.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  details.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071126' } };
  details.mergeCells('A2:M2');
  details.getCell('A2').value = `Pagamentos de ${date(input.from)} a ${date(input.to)} · ${input.company} · ${input.supplier} · ${input.category}`;
  const header = details.getRow(4);
  header.values = ['Pagamento', 'Empresa', 'Fornecedor', 'Documento', 'Parcela', 'Categoria', 'Conta bancária', 'Forma', 'Transação', 'Principal', 'Juros/Multa/Outros', 'Desconto', 'Total pago'];
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  });
  input.items.forEach(item => {
    const row = details.addRow([
      date(item.paymentDate), safe(item.companyName), safe(item.supplierName), safe(item.documentNumber),
      `${item.installmentNumber}/${item.installmentCount}`, safe(item.categoryName), safe(item.bankAccountName),
      safe(item.paymentMethodName), safe(item.transactionNumber ?? ''), Number(item.principalAmount),
      Number(item.interestAmount) + Number(item.penaltyAmount) + Number(item.additionalAmount),
      Number(item.discountAmount), Number(item.movementAmount),
    ]);
    for (let column = 10; column <= 13; column += 1) row.getCell(column).numFmt = '"R$" #,##0.00';
  });
  details.autoFilter = { from: 'A4', to: 'M4' };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
