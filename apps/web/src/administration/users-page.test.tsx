// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './users-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/users') return Promise.resolve({ data: { data: [{ id: 'user-1', fullName: 'Operador Financeiro', email: 'operador@example.com', isMaster: false, isActive: true, roles: [{ id: 'role-operator', code: 'AP_OPERATOR', name: 'Operador de Contas a Pagar' }], roleIds: ['role-operator'], companies: [{ companyId: 'company-abc', companyName: 'ABC Center', isDefault: true, accessScope: 'OPERATIONAL' }] }], page: 1, pageSize: 20, total: 1 } });
    if (url === '/api/v1/roles') return Promise.resolve({ data: [{ id: 'role-operator', code: 'AP_OPERATOR', name: 'Operador de Contas a Pagar' }] });
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-abc', legalName: 'ABC Center' }] } });
    return Promise.resolve({ data: { data: [] } });
  }),
  post: vi.fn(() => Promise.resolve({ data: { id: 'user-new' } })),
  patch: vi.fn(() => Promise.resolve({ data: { id: 'user-1' } })),
  delete: vi.fn(() => Promise.resolve({ data: { id: 'user-1' } })),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message); }
  },
  httpClient: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UsersPage', () => {
  it('renders users and creates a user with role and company access', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeTruthy();
    expect(await screen.findByText('Operador Financeiro')).toBeTruthy();
    expect(screen.getByText('ABC Center')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Novo usuário' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nova Operadora' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } });
    fireEvent.click(await screen.findByLabelText('Operador de Contas a Pagar'));
    fireEvent.click(await screen.findByLabelText('ABC Center'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/users', expect.objectContaining({
      fullName: 'Nova Operadora',
      email: 'nova@example.com',
      password: 'senha-segura',
      roleIds: ['role-operator'],
      companies: [{ companyId: 'company-abc', isDefault: true, accessScope: 'OPERATIONAL' }],
    })));
  });
});
