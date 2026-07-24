// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurrencesPage } from './recurrences-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/recurrences') {
      return Promise.resolve({
        data: {
          data: [
            {
              id: 'rec-1',
              companyId: 'company-1',
              companyName: 'HRM Motos Matriz',
              supplierName: 'Imobiliaria Centro Ltda',
              categoryName: 'Despesas Fixas',
              paymentMethodName: 'Boleto',
              description: 'Aluguel loja principal',
              baseDocumentNumber: 'ALUGUEL-HRM',
              baseAmount: '2500.00',
              frequencyCode: 'MONTHLY',
              startDate: '2026-07-01',
              endDate: '2026-12-31',
              nextOccurrenceDate: '2026-08-05',
              generatedCount: 1,
              statusCode: 'ACTIVE',
            },
            {
              id: 'rec-2',
              companyId: 'company-1',
              companyName: 'HRM Motos Matriz',
              supplierName: 'Internet Fibra SA',
              categoryName: 'Serviços',
              paymentMethodName: 'Pix',
              description: 'Link dedicado',
              baseDocumentNumber: 'NET-HRM',
              baseAmount: '399.90',
              frequencyCode: 'MONTHLY',
              startDate: '2026-07-10',
              endDate: '2026-12-31',
              nextOccurrenceDate: '2026-08-10',
              generatedCount: 0,
              statusCode: 'SUSPENDED',
            },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
        },
      });
    }
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-1', legalName: 'HRM Motos Matriz' }] } });
    if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [{ id: 'supplier-1', legalName: 'Imobiliaria Centro Ltda' }] } });
    if (url === '/api/v1/financial-categories') return Promise.resolve({ data: { data: [{ id: 'category-1', name: 'Despesas Fixas' }] } });
    if (url === '/api/v1/document-types') return Promise.resolve({ data: { data: [{ id: 'document-type-1', name: 'Contrato' }] } });
    if (url === '/api/v1/payment-methods') return Promise.resolve({ data: { data: [{ id: 'payment-method-1', name: 'Boleto' }] } });
    if (url === '/api/v1/payment-terms') return Promise.resolve({ data: { data: [{ id: 'payment-term-1', name: 'Mensal' }] } });
    if (url === '/api/v1/cost-centers') return Promise.resolve({ data: { data: [{ id: 'cost-center-1', name: 'Administrativo' }] } });
    if (url === '/api/v1/recurrences/rec-1/cancellation-preview') {
      return Promise.resolve({
        data: {
          recurrenceId: 'rec-1',
          total: 2,
          titles: [
            { payableTitleId: 'title-1', occurrenceDate: '2026-08-05', sequenceNumber: 2, documentNumber: 'ALUGUEL-HRM-20260805', documentSeries: null, description: 'Aluguel loja principal', statusCode: 'OPEN', dueDate: '2026-08-05', openBalance: '2500.00', installmentCount: 1 },
            { payableTitleId: 'title-2', occurrenceDate: '2026-09-05', sequenceNumber: 3, documentNumber: 'ALUGUEL-HRM-20260905', documentSeries: null, description: 'Aluguel loja principal', statusCode: 'OPEN', dueDate: '2026-09-05', openBalance: '2500.00', installmentCount: 1 },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  }),
  post: vi.fn((url: string) => {
    if (url === '/api/v1/recurrences') {
      return Promise.resolve({ data: { id: 'rec-new' } });
    }
    if (url === '/api/v1/recurrences/rec-1/preview-generation') {
      return Promise.resolve({
        data: {
          recurrenceId: 'rec-1',
          total: 2,
          occurrences: [
            { occurrenceDate: '2026-08-05', dueDate: '2026-08-05', sequenceNumber: 2, documentNumber: 'ALUGUEL-HRM-20260805', amount: 2500 },
            { occurrenceDate: '2026-09-05', dueDate: '2026-09-05', sequenceNumber: 3, documentNumber: 'ALUGUEL-HRM-20260905', amount: 2500 },
          ],
        },
      });
    }
    if (url === '/api/v1/recurrences/rec-1/generate') {
      return Promise.resolve({
        data: {
          recurrenceId: 'rec-1',
          total: 2,
          generated: [
            { id: 'title-1', documentNumber: 'ALUGUEL-HRM-20260805', occurrenceDate: '2026-08-05' },
            { id: 'title-2', documentNumber: 'ALUGUEL-HRM-20260905', occurrenceDate: '2026-09-05' },
          ],
        },
      });
    }
    if (url === '/api/v1/recurrences/rec-2/reactivate') {
      return Promise.resolve({ data: { id: 'rec-2', statusCode: 'ACTIVE' } });
    }
    if (url === '/api/v1/recurrences/rec-1/cancel') {
      return Promise.resolve({ data: { id: 'rec-1', cancelledFutureTitles: 1, cancelledFutureTitlesRequested: true } });
    }
    return Promise.resolve({ data: {} });
  }),
}));

vi.mock('../api/http-client', () => ({
  httpClient: {
    get: mocks.get,
    post: mocks.post,
  },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RecurrencesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RecurrencesPage', () => {
  beforeEach(() => {
    mocks.get.mockClear();
    mocks.post.mockClear();
  });

  afterEach(() => cleanup());

  it('renders recurrence list with summary cards and row actions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Contas Recorrentes' })).toBeTruthy();
    expect(await screen.findByText('Aluguel loja principal')).toBeTruthy();
    expect(screen.getByText('Link dedicado')).toBeTruthy();
    expect(screen.getByText('2 registros encontrados.')).toBeTruthy();
    expect(screen.getByText('Ativas na página')).toBeTruthy();
    expect(screen.getByText('Suspensas na página')).toBeTruthy();
    expect(screen.getByText('R$ 2.899,90')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Gerar' })[0]).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Reativar' })).toHaveProperty('disabled', false);
  });

  it('creates a new recurrence from the modal form', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '+ Nova recorrência' }));
    expect(await screen.findByText('Nova recorrência')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'company-1' } });
    fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: 'supplier-1' } });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'category-1' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'document-type-1' } });
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: 'payment-method-1' } });
    fireEvent.change(screen.getByLabelText('Condição de pagamento'), { target: { value: 'payment-term-1' } });
    fireEvent.change(screen.getByLabelText('Centro de custo'), { target: { value: 'cost-center-1' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Aluguel filial Campinas' } });
    fireEvent.change(screen.getByLabelText('Documento base'), { target: { value: 'ALUGUEL-CPS' } });
    fireEvent.change(screen.getByLabelText('Valor base'), { target: { value: '1800' } });
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-07-23' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-12-23' } });
    fireEvent.change(screen.getByLabelText('Dia de vencimento'), { target: { value: '23' } });
    fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Contrato anual com reajuste futuro fora do MVP.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar recorrência' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/recurrences', expect.objectContaining({
      companyId: 'company-1',
      supplierId: 'supplier-1',
      categoryId: 'category-1',
      documentTypeId: 'document-type-1',
      paymentMethodId: 'payment-method-1',
      paymentTermId: 'payment-term-1',
      costCenterId: 'cost-center-1',
      description: 'Aluguel filial Campinas',
      baseDocumentNumber: 'ALUGUEL-CPS',
      baseAmount: 1800,
      startDate: '2026-07-23',
      endDate: '2026-12-23',
      dueDay: 23,
    })));
  });

  it('previews and confirms title generation for an active recurrence', async () => {
    renderPage();

    const generateButtons = await screen.findAllByRole('button', { name: 'Gerar' });
    const firstGenerateButton = generateButtons[0];
    if (!firstGenerateButton) throw new Error('Generate button not found');
    fireEvent.click(firstGenerateButton);

    fireEvent.change(await screen.findByLabelText('Ou quantidade de ocorrências'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/recurrences/rec-1/preview-generation', { occurrenceCount: 2, untilDate: undefined }));
    expect(await screen.findByText('ALUGUEL-HRM-20260805')).toBeTruthy();
    expect(screen.getByText('ALUGUEL-HRM-20260905')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar geração de 2' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/recurrences/rec-1/generate', { occurrenceCount: 2, untilDate: undefined }));
    expect(await screen.findByText('2 títulos gerados com sucesso.')).toBeTruthy();
  });

  it('cancels a recurrence with optional future-title cancellation', async () => {
    renderPage();

    const cancelButtons = await screen.findAllByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelButtons[0]!);

    expect(await screen.findByRole('dialog', { name: 'Cancelar recorrência' })).toBeTruthy();
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/v1/recurrences/rec-1/cancellation-preview'));
    expect(await screen.findByText('ALUGUEL-HRM-20260805')).toBeTruthy();
    expect(screen.getByText('ALUGUEL-HRM-20260905')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: 'Fornecedor substituído por novo contrato.' } });
    fireEvent.click(screen.getByLabelText('Também cancelar títulos futuros em aberto'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar recorrência e títulos futuros' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/recurrences/rec-1/cancel', {
      reason: 'Fornecedor substituído por novo contrato.',
      cancelFutureTitles: true,
    }));
    expect(await screen.findByText('Recorrência cancelada. 1 título futuro em aberto também foi cancelado.')).toBeTruthy();
  });
});
