import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './master-data-page';
import { resources, type ResourceConfig } from './resources';

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {},
  httpClient: {
    get: vi.fn(() => Promise.resolve({ data: { data: [], page: 1, pageSize: 20, total: 0 } })),
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
});