import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './master-data-page';
import { resources, type ResourceConfig } from './resources';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/bank-accounts') {
      return Promise.resolve({
        data: {
          data: [{ id: 'bank-account-id', companyName: 'ABC Center', bankName: 'Banco Teste', accountName: 'Conta Matriz', accountNumber: '123', isActive: true }],
          page: 1,
          pageSize: 20,
          total: 1,
        },
      });
    }
    if (url === '/api/v1/bank-accounts/bank-account-id') {
      return Promise.resolve({
        data: {
          id: 'bank-account-id',
          companyId: 'company-id',
          bankId: 'bank-id',
          accountName: 'Conta Matriz',
          accountNumber: '123',
          accountType: 'CHECKING',
          isActive: true,
        },
      });
    }
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-id', legalName: 'ABC Center' }], page: 1, pageSize: 20, total: 1 } });
    if (url === '/api/v1/banks') return Promise.resolve({ data: { data: [{ id: 'bank-id', name: 'Banco Teste' }], page: 1, pageSize: 20, total: 1 } });
    return Promise.resolve({ data: { data: [], page: 1, pageSize: 20, total: 0 } });
  }),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {},
  httpClient: {
    get: mocks.get,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderWithProviders(element: React.ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function resource(key: string): ResourceConfig {
  const config = resources[key];
  if (!config) throw new Error('Resource not found: ' + key);
  return config;
}

function wasRequested(url: string): boolean {
  return mocks.get.mock.calls.some(([requestedUrl]) => requestedUrl === url);
}

describe('MasterDataPage navigation state', () => {
  it('clears search when switching between resources', async () => {
    const view = renderWithProviders(<MasterDataPage config={resource('payment-methods')} />);

    const paymentSearch = screen.getByRole('textbox', { name: 'Pesquisar em Formas de pagamento' });
    fireEvent.change(paymentSearch, { target: { value: 'BO' } });
    expect(paymentSearch).toHaveValue('BO');

    view.rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <MasterDataPage config={resource('document-types')} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Pesquisar em Tipos de documento' })).toHaveValue(''));
  });

  it('loads the bank account detail before filling edit selects', async () => {
    renderWithProviders(<MasterDataPage config={resource('bank-accounts')} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar Conta bancária' });
    await waitFor(() => expect(wasRequested('/api/v1/bank-accounts/bank-account-id')).toBe(true));
    expect(within(dialog).getByLabelText('Empresa')).toHaveValue('company-id');
    expect(within(dialog).getByLabelText('Banco')).toHaveValue('bank-id');
  });
});
