// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { UsersPage } from './users-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string) => {
    if (url === '/api/v1/users') return Promise.resolve({ data: { data: [{ id: 'user-1', fullName: 'Operador Financeiro', email: 'operador@example.com', isMaster: false, isActive: true, roles: [{ id: 'role-operator', code: 'AP_OPERATOR', name: 'Operador de Contas a Pagar' }], roleIds: ['role-operator'], companies: [{ companyId: 'company-abc', companyName: 'ABC Center', isDefault: true, accessScope: 'OPERATIONAL' }] }], page: 1, pageSize: 20, total: 1 } });
    if (url === '/api/v1/roles') return Promise.resolve({ data: [{ id: 'role-operator', code: 'AP_OPERATOR', name: 'Operador de Contas a Pagar' }] });
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-abc', legalName: 'ABC Center' }] } });
    return Promise.resolve({ data: { data: [] } });
  }),
  post: vi.fn((url: string, payload?: unknown) => { void url; void payload; return Promise.resolve({ data: { id: 'user-new' } }); }),
  patch: vi.fn((url: string, payload?: unknown) => { void url; void payload; return Promise.resolve({ data: { id: 'user-1' } }); }),
  delete: vi.fn((url: string) => { void url; return Promise.resolve({ data: { id: 'user-1' } }); }),
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

function renderUsersPage(currentUserId = 'master-user'): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{
        session: {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: { id: currentUserId, fullName: 'Master', email: 'master@example.com', isMaster: true, roles: ['MASTER'], permissions: ['USER_MANAGE'] },
        },
        initializing: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      }}>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return client;
}

describe('UsersPage', () => {
  it('renders users and creates a user with role and company access', async () => {
    renderUsersPage();

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

  it('sends password recovery from the user edit modal', async () => {
    renderUsersPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar recuperação' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/users/user-1/password-reset'));
  });

  it('blocks self access changes from the edit payload', async () => {
    renderUsersPage('user-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(await screen.findByText(/Por segurança/)).toBeInTheDocument();
    expect(screen.getByLabelText('Operador de Contas a Pagar')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Meu Nome Atualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
    const call = mocks.patch.mock.calls[0];
    expect(call).toBeDefined();
    const payload = call?.[1];
    expect(payload).not.toHaveProperty('roleIds');
    expect(payload).not.toHaveProperty('companies');
    expect(payload).not.toHaveProperty('isMaster');
    expect(payload).not.toHaveProperty('isActive');
  });
});
