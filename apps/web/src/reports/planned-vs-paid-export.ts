import type { PlannedVsPaidResponse } from '../intelligence/contracts';

function safe(value: string): string { return /^[=+\-@]/.test(value) ? `'${value}` : value; }
function date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }

export async function buildPlannedVsPaidWorkbook(input: {
  from: string; to: string; generatedAt: Date; company: string; supplier: string; category: string;
  report: PlannedVsPaidResponse;
}): Promise<Uint8Array> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'FinControl';
  workbook.created = input.generatedAt;
  workbook.title = 'Previsto x pago';
  const summary = workbook.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 30 }, { width: 26 }, { width: 24 }, { width: 22 }];
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'FINCONTROL · PREVISTO X PAGO';
  summary.getCell('A1').font = { bold: true, size: 17, color: { argb: 'FFFFFFFF' } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071126' } };
  summary.getRow(1).height = 32;
  summary.addRow([`Período: ${date(input.from)} a ${date(input.to)}`]);
  summary.addRow([`Gerado em: ${input.generatedAt.toLocaleString('pt-BR')}`]);
  summary.addRow(['Empresa', safe(input.company), 'Fornecedor', safe(input.supplier)]);
  summary.addRow(['Categoria', safe(input.category)]);
  summary.addRow([]);
  const metrics: Array<[string, number, boolean]> = [
    ['Previsto por vencimento', Number(input.report.summary.planned), true],
    ['Pago por data do pagamento', Number(input.report.summary.paid), true],
    ['Diferença (pago - previsto)', Number(input.report.summary.difference), true],
    ['Parcelas previstas', Number(input.report.summary.installmentCount), false],
    ['Pagamentos efetivos', Number(input.report.summary.paymentCount), false],
    ['Empresas', Number(input.report.summary.companyCount), false],
  ];
  metrics.forEach(([label, value, money], index) => {
    const row = summary.getRow(7 + index);
    row.values = [label, value];
    row.getCell(1).font = { bold: true, color: { argb: 'FF0F766E' } };
    if (money) row.getCell(2).numFmt = '"R$" #,##0.00';
  });
  summary.mergeCells('A15:D15');
  summary.getCell('A15').value = 'Previsto: valor original das parcelas com vencimento no período. Pago: movimentação efetiva na data da baixa, sem estornos. A diferença não é saldo em atraso.';
  summary.getCell('A15').alignment = { wrapText: true };
  summary.getRow(15).height = 45;

  const addGroupSheet = (name: string, firstHeader: string, groups: PlannedVsPaidResponse['byDate'], formatLabel: (value: string) => string): void => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    sheet.columns = [{ width: 32 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 18 }, { width: 18 }];
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `FINCONTROL · ${name.toUpperCase()}`;
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071126' } };
    const header = sheet.getRow(3);
    header.values = [firstHeader, 'Previsto', 'Pago', 'Pago - previsto', 'Parcelas', 'Pagamentos'];
    header.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    });
    groups.forEach(group => {
      const row = sheet.addRow([formatLabel(group.label), Number(group.planned), Number(group.paid),
        Number(group.difference), Number(group.installmentCount), Number(group.paymentCount)]);
      for (let column = 2; column <= 4; column += 1) row.getCell(column).numFmt = '"R$" #,##0.00';
    });
    sheet.autoFilter = { from: 'A3', to: 'F3' };
  };
  addGroupSheet('Por data', 'Data', input.report.byDate, date);
  addGroupSheet('Por empresa', 'Empresa', input.report.byCompany, safe);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
