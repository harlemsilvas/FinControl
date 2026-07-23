// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PayableFormPage } from './payable-form-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/payables/payable-1') {
      return Promise.resolve({
        data: {
          id: 'payable-1',
          supplierId: 'supplier-1',
          categoryId: 'category-1',
          documentTypeId: 'document-type-1',
          paymentTermId: 'payment-term-1',
          costCenterId: 'cost-center-1',
          documentNumber: 'ALUGUEL-001',
          documentSeries: null,
          description: 'Aluguel recorrente',
          supplierName: 'Imobiliária Centro',
          categoryName: 'Despesas Fixas',
          statusCode: 'OPEN',
          totalAmount: '2500.00',
          openBalance: '2500.00',
          issueDate: '2026-07-01',
          firstDueDate: '2026-08-05',
          paymentMethodName: 'Boleto',
          originalAmount: '2500.00',
          discountAmount: '0.00',
          additionalAmount: '0.00',
          recurrenceId: 'rec-1',
          recurrenceOccurrenceDate: '2026-08-05',
          recurrenceSequenceNumber: 2,
          recurrenceStatusCode: 'ACTIVE',
          notes: '',
          installments: [{ id: 'inst-1', installmentNumber: 1, installmentCount: 1, amount: '2500.00', dueDate: '2026-08-05', paymentMethodId: 'payment-method-1' }],
          approvals: [],
          attachments: [],
          tags: [],
          payments: [],
        },
      });
    }
    if (url === '/api/v1/recurrences/rec-1') return Promise.resolve({ data: { id: 'rec-1', companyId: 'company-1', supplierId: 'supplier-1', categoryId: 'category-1', costCenterId: 'cost-center-1', documentTypeId: 'document-type-1', paymentMethodId: 'payment-method-1', paymentTermId: 'payment-term-1', description: 'Aluguel recorrente', baseDocumentNumber: 'ALUGUEL', baseAmount: '2500.00', frequencyCode: 'MONTHLY', startDate: '2026-08-05', endDate: null, maxOccurrences: null, dueDay: 5, isOpenEnded: false, notes: '' } });
    if (url === '/api/v1/recurrences/rec-1/cancellation-preview') return Promise.resolve({ data: { recurrenceId: 'rec-1', titles: [], total: 0 } });
    return Promise.resolve({ data: { data: [], page: 1, pageSize: 100, total: 0 } });
  }),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    code?: string;
  },
  httpClient: {
    get: mocks.get,
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('PayableFormPage new title', () => {
  it('renders the new payable form without locking navigation actions', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/payables/new']}>
          <Routes>
            <Route path="/payables/new" element={<PayableFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Nova Conta a Pagar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('shows the recurrence actions shortcut on the payable detail when the title belongs to a series', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/payables/payable-1']}>
          <Routes>
            <Route path="/payables/:id" element={<PayableFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Editar Conta a Pagar' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Ações da recorrência' })).toBeTruthy();
  });
});
