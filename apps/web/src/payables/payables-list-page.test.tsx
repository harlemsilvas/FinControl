// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http-client';
import { PayablesListPage } from './payables-list-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/payables') {
      return Promise.resolve({
        data: {
          data: [
            {
              id: 'payable-1',
              documentNumber: 'NF-001',
              documentSeries: null,
              description: 'Compra de peças',
              supplierName: 'ABC Distribuidora Ltda',
              categoryName: 'Fornecedores',
              statusCode: 'OPEN',
              totalAmount: '8450.00',
              openBalance: '8450.00',
              issueDate: '2026-07-01',
              firstDueDate: '2026-07-19',
              paymentMethodName: 'Boleto',
            },
            {
              id: 'payable-2',
              documentNumber: 'ALUGUEL-HRM-20260805',
              documentSeries: null,
              description: 'Aluguel loja principal',
              supplierName: 'Imobiliaria Centro Ltda',
              categoryName: 'Despesas Fixas',
              statusCode: 'OPEN',
              totalAmount: '2500.00',
              openBalance: '2500.00',
              issueDate: '2026-07-01',
              firstDueDate: '2026-08-05T03:00:00.000Z',
              paymentMethodName: 'Boleto',
              originCode: 'RECURRENCE',
              recurrenceId: 'rec-1',
              recurrenceOccurrenceDate: '2026-08-05T03:00:00.000Z',
              recurrenceSequenceNumber: 2,
              recurrenceStatusCode: 'ACTIVE',
            },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
        },
      });
    }
    if (url === '/api/v1/financial-categories') return Promise.resolve({ data: { data: [{ id: 'category-1', name: 'Despesas Fixas' }] } });
    if (url === '/api/v1/cost-centers') return Promise.resolve({ data: { data: [{ id: 'cost-center-1', name: 'Administrativo' }] } });
    if (url === '/api/v1/document-types') return Promise.resolve({ data: { data: [{ id: 'document-type-1', name: 'Contrato' }] } });
    if (url === '/api/v1/payment-methods') return Promise.resolve({ data: { data: [{ id: 'payment-method-1', name: 'Boleto' }] } });
    if (url === '/api/v1/payment-terms') return Promise.resolve({ data: { data: [{ id: 'payment-term-1', name: 'Mensal' }] } });
    if (url === '/api/v1/recurrences/rec-1') return Promise.resolve({ data: { id: 'rec-1', companyId: 'company-1', supplierId: 'supplier-1', categoryId: 'category-1', costCenterId: 'cost-center-1', documentTypeId: 'document-type-1', paymentMethodId: 'payment-method-1', paymentTermId: 'payment-term-1', description: 'Aluguel loja principal', baseDocumentNumber: 'ALUGUEL-HRM', baseAmount: '2500.00', frequencyCode: 'MONTHLY', startDate: '2026-08-05', endDate: null, maxOccurrences: null, dueDay: 5, isOpenEnded: false, notes: 'Contrato reajustável' } });
    if (url === '/api/v1/recurrences/rec-1/cancellation-preview') return Promise.resolve({ data: { recurrenceId: 'rec-1', titles: [{ payableTitleId: 'payable-2', occurrenceDate: '2026-08-05', sequenceNumber: 2, documentNumber: 'ALUGUEL-HRM-20260805', description: 'Aluguel loja principal', dueDate: '2026-08-05', openBalance: '2500.00' }], total: 1 } });
    return Promise.resolve({ data: { data: [] } });
  }),
  post: vi.fn(() => Promise.resolve({ data: { effectiveDate: '2026-08-05', cancelledFutureTitles: 1 } })),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message); }
  },
  httpClient: {
    get: mocks.get,
    post: mocks.post,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PayablesListPage', () => {
  it('renders redesigned payable list data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PayablesListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Contas a Pagar' })).toBeTruthy();
    expect(await screen.findByText('ABC Distribuidora Ltda')).toBeTruthy();
    expect(screen.getAllByText('Boleto').length).toBeGreaterThan(0);
    expect(screen.getByText('19/07/2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: '+ Nova conta a pagar' })).toBeTruthy();
    expect(screen.getByText('Recorrente')).toBeTruthy();
  });

  it('opens recurrence actions from the payable row and revises the series from a future date', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PayablesListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click((await screen.findAllByRole('button', { name: 'Ações da recorrência' }))[0]!);
    expect(await screen.findByRole('menu', { name: 'Menu de ações da recorrência' })).toBeTruthy();
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Revisar recorrência' }));
    expect(await screen.findByRole('dialog', { name: 'Ações da recorrência' })).toBeTruthy();
    fireEvent.change(await screen.findByLabelText('Vigência a partir de'), { target: { value: '2026-08-05' } });
    fireEvent.change(screen.getByLabelText('Motivo da revisão'), { target: { value: 'Reajuste contratual aprovado.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova vigência' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/recurrences/rec-1/revise', expect.objectContaining({
      effectiveDate: '2026-08-05',
      endDate: '2027-02-01',
      reason: 'Reajuste contratual aprovado.',
      cancelFutureTitles: true,
    })));
  });

  it('shows a clearer message when the API rejects the revision payload', async () => {
    mocks.post.mockRejectedValueOnce(Object.assign(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data'), {
      details: [{ path: 'endDate', message: 'Informe data final, quantidade de ocorrências ou confirme recorrência sem prazo final.' }],
    }));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PayablesListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click((await screen.findAllByRole('button', { name: 'Ações da recorrência' }))[0]!);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Revisar recorrência' }));
    fireEvent.change(await screen.findByLabelText('Motivo da revisão'), { target: { value: 'Ajuste de contrato em revisão.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova vigência' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Preenchemos 180 dias por padrão');
  });

  it('does not render the recurrence actions shortcut for terminal series', async () => {
    mocks.get.mockImplementationOnce((url: string) => {
      if (url === '/api/v1/payables') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'payable-terminal',
                documentNumber: 'NF-999',
                documentSeries: null,
                description: 'Conta recorrente finalizada',
                supplierName: 'Fornecedor Finalizado',
                categoryName: 'Despesas Fixas',
                statusCode: 'OPEN',
                totalAmount: '100.00',
                openBalance: '100.00',
                issueDate: '2026-07-01',
                firstDueDate: '2026-08-05',
                paymentMethodName: 'Boleto',
                recurrenceId: 'rec-terminal',
                recurrenceOccurrenceDate: '2026-08-05',
                recurrenceSequenceNumber: 1,
                recurrenceStatusCode: 'FINISHED',
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      }
      return mocks.get(url);
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PayablesListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Série finalizada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ações da recorrência' })).toBeNull();
  });
});
