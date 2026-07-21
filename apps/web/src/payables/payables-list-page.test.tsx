import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PayablesListPage } from './payables-list-page';

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message); }
  },
  httpClient: {
    get: vi.fn((url: string) => {
      if (url !== '/api/v1/payables') return Promise.resolve({ data: { data: [] } });

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
          ],
          page: 1,
          pageSize: 20,
          total: 1,
        },
      });
    }),
  },
}));

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

    expect(await screen.findByRole('heading', { name: 'Contas a Pagar' })).toBeInTheDocument();
    expect(await screen.findByText('ABC Distribuidora Ltda')).toBeInTheDocument();
    expect(screen.getByText('Boleto')).toBeInTheDocument();
    expect(screen.getByText('19/07/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Nova conta a pagar' })).toBeInTheDocument();
  });
});