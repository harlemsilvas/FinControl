import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SuppliersPage } from './suppliers-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/suppliers/cnpj/11222333000181') return Promise.resolve({ data: {
      source: 'BrasilAPI / dados públicos do CNPJ', documentNumber: '11222333000181', legalName: 'Fornecedor Consultado Ltda',
      tradeName: 'Fornecedor Consultado', postalCode: '80010000', street: 'Rua das Flores', streetNumber: '123',
      addressComplement: 'Galpão 2', neighborhood: 'Centro', cityName: 'São Paulo', stateCode: 'SP',
      phone: '1133334444', email: 'contato@example.com', registrationStatus: 'ATIVA',
    } });
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

afterEach(() => cleanup());

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

  it('fills supplier fields from a public CNPJ lookup for user review', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Novo fornecedor' }));
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '11222333000181' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CNPJ' }));

    await waitFor(() => expect(screen.getByLabelText(/Nome \/ Razão Social/)).toHaveValue('Fornecedor Consultado Ltda'));
    expect(screen.getByLabelText('Nome Fantasia')).toHaveValue('Fornecedor Consultado');
    expect(screen.getByLabelText('CEP')).toHaveValue('80010-000');
    expect(screen.getByLabelText(/Logradouro/)).toHaveValue('Rua das Flores');
    expect(screen.getByLabelText('Estado')).toHaveValue('state-sp');
    expect(screen.getByRole('combobox', { name: /Cidade cadastrada/ })).toHaveValue('city-sp');
    expect(screen.getByLabelText('Telefone Comercial')).toHaveValue('(11) 3333-4444');
  });
});
