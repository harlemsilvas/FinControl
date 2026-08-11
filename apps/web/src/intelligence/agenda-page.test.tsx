// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgendaPage } from './agenda-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string, config?: { params?: Record<string, unknown> }) => {
    void config;
    const dueDate = new Date().toISOString().slice(0, 10);
    if (url === '/api/v1/agenda') {
      return Promise.resolve({
        data: {
          data: [
            {
              id: 'agenda-1',
              payableTitleId: 'payable-1',
              documentNumber: 'NF-AGENDA',
              description: 'Conta do dia',
              supplierName: 'Fornecedor Agenda',
              companyName: 'HRM Motos',
              categoryName: 'Operacional',
              installmentNumber: 1,
              installmentCount: 1,
              dueDate,
              openBalance: '150.00',
              highlight: 'TODAY',
            },
            {
              id: 'agenda-2',
              payableTitleId: 'payable-2',
              documentNumber: 'NF-AGENDA-2',
              description: 'Segunda conta do dia',
              supplierName: 'Fornecedor Dois',
              companyName: 'HRM Motos',
              categoryName: 'Operacional',
              installmentNumber: 1,
              installmentCount: 1,
              dueDate,
              openBalance: '75.00',
              highlight: 'TODAY',
            },
            {
              id: 'agenda-3',
              payableTitleId: 'payable-3',
              documentNumber: 'NF-AGENDA-3',
              description: 'Terceira conta do dia',
              supplierName: 'Fornecedor Tres',
              companyName: 'HRM Motos',
              categoryName: 'Operacional',
              installmentNumber: 1,
              installmentCount: 1,
              dueDate,
              openBalance: '35.00',
              highlight: 'TODAY',
            },
            {
              id: 'agenda-4',
              payableTitleId: 'payable-4',
              documentNumber: 'NF-AGENDA-4',
              description: 'Quarta conta do dia',
              supplierName: 'Fornecedor Quatro',
              companyName: 'HRM Motos',
              categoryName: 'Operacional',
              installmentNumber: 1,
              installmentCount: 1,
              dueDate,
              openBalance: '25.00',
              highlight: 'TODAY',
            },
          ],
          total: '285.00',
          count: 4,
        },
      });
    }
    if (url === '/api/v1/dashboard') return Promise.resolve({ data: { summary: { totalPayable: '285.00', overdue: '0', upcoming: '285.00', paid: '0' }, dueSeries: [], categories: [], upcoming: [] } });
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-hrm', legalName: 'HRM Motos' }] } });
    if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [{ id: 'supplier-1', legalName: 'Fornecedor Agenda' }] } });
    if (url === '/api/v1/financial-categories') return Promise.resolve({ data: { data: [{ id: 'category-1', name: 'Operacional' }] } });
    return Promise.resolve({ data: { data: [] } });
  }),
}));

function lastParamsFor(url: string): Record<string, unknown> | undefined {
  return [...mocks.get.mock.calls].reverse().find(([calledUrl]) => calledUrl === url)?.[1]?.params;
}

vi.mock('../api/http-client', () => ({
  httpClient: {
    get: mocks.get,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AgendaPage', () => {
  it('applies the explicit company filter and preserves it in the payment link', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole('option', { name: 'HRM Motos' });
    const companyFilter = screen.getByLabelText('Empresa');
    fireEvent.change(companyFilter, { target: { value: 'company-hrm' } });

    await waitFor(() => expect(lastParamsFor('/api/v1/agenda')?.companyId).toBe('company-hrm'));
    expect(lastParamsFor('/api/v1/dashboard')?.companyId).toBe('company-hrm');
    expect((await screen.findByTitle(/HRM Motos - Fornecedor Agenda/)).getAttribute('href')).toContain(`companyId=company-hrm`);
  });

  it('opens a side panel with all accounts hidden behind the day overflow button', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'Contas do dia' })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '+1 conta' }));

    expect(screen.getByRole('heading', { name: 'Contas do dia' })).toBeInTheDocument();
    expect(screen.getAllByTitle(/HRM Motos - Fornecedor Quatro/)[0]).toHaveAttribute('href', expect.stringContaining('/payments?status=OPEN'));
  });
});
