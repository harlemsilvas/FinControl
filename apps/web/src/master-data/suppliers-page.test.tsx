import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SuppliersPage } from './suppliers-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [], page: 1, pageSize: 20, total: 0 } });
    if (url === '/api/v1/supplier-statuses') return Promise.resolve({ data: { data: [{ id: 'status-active', code: 'ACTIVE', name: 'Ativo' }] } });
    if (url === '/api/v1/supplier-categories') return Promise.resolve({ data: { data: [{ id: 'category-supplier', code: 'SUPPLIER', name: 'Fornecedor' }] } });
    if (url === '/api/v1/states') return Promise.resolve({ data: { data: [{ id: 'state-sp', code: 'SP', name: 'São Paulo' }, { id: 'state-mg', code: 'MG', name: 'Minas Gerais' }] } });
    if (url === '/api/v1/cities') return Promise.resolve({ data: { data: [
      { id: 'city-sp', stateId: 'state-sp', name: 'São Paulo' },
      { id: 'city-sbc', stateId: 'state-sp', name: 'São Bernardo do Campo' },
      { id: 'city-bh', stateId: 'state-mg', name: 'Belo Horizonte' },
    ] } });
    return Promise.resolve({ data: { data: [] } });
  }),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {},
  httpClient: { get: mocks.get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><SuppliersPage /></MemoryRouter></QueryClientProvider>);
}

describe('SuppliersPage', () => {
  it('loads cities with the API page-size limit and filters them by selected state', async () => {
    renderPage();

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/v1/cities', { params: { pageSize: 100, active: true } }));
    fireEvent.click(await screen.findByRole('button', { name: 'Novo fornecedor' }));

    const state = await screen.findByLabelText('Estado');
    const city = await screen.findByRole('combobox', { name: /Cidade cadastrada/ });
    expect(city).toBeDisabled();

    fireEvent.change(state, { target: { value: 'state-sp' } });
    expect(city).not.toBeDisabled();
    expect(within(city).getByRole('option', { name: 'São Paulo' })).toBeInTheDocument();
    expect(within(city).getByRole('option', { name: 'São Bernardo do Campo' })).toBeInTheDocument();
    expect(within(city).queryByRole('option', { name: 'Belo Horizonte' })).not.toBeInTheDocument();
  });
});
