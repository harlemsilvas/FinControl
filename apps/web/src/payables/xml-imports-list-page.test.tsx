import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import type { AuthContextValue } from '../auth/auth-context';
import { XmlImportsListPage } from './xml-imports-list-page';

const requests = vi.hoisted(() => ({ params: [] as Record<string, unknown>[] }));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message); }
  },
  httpClient: {
    get: vi.fn((url: string, options?: { params?: Record<string, unknown> }) => {
      if (url === '/api/v1/xml-imports') {
        requests.params.push(options?.params ?? {});
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'xml-1',
                importedAt: '2026-10-01T00:24:00.000Z',
                statusCode: 'RECEIVED',
                accessKey: '12345678901234567890123456789012345678901234',
                supplierLegalName: 'Auto Peças Centro Ltda',
                recipientLegalName: 'HRM Motos Filial',
                recipientDocumentNumber: '12345678000270',
                recipientKind: 'BRANCH',
                documentNumber: '4455',
                documentSeries: '1',
                dueDate: '2026-07-30',
                paymentAmount: '980.50',
                hasGeneratedTitle: false,
                companyParameters: {
                  defaultFinancialCategoryId: 'category-id',
                  defaultDocumentTypeId: 'document-type-id',
                  defaultPaymentMethodId: 'payment-method-id',
                  defaultPaymentTermId: 'payment-term-id',
                  defaultCostCenterId: 'cost-center-id',
                },
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      }
      if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [] } });
      if (url === '/api/v1/financial-categories') return Promise.resolve({ data: { data: [{ id: 'category-id', name: 'Peças e Manutenção' }] } });
      if (url === '/api/v1/document-types') return Promise.resolve({ data: { data: [{ id: 'document-type-id', name: 'Nota Fiscal' }] } });
      if (url === '/api/v1/payment-methods') return Promise.resolve({ data: { data: [{ id: 'payment-method-id', name: 'Boleto' }] } });
      if (url === '/api/v1/payment-terms') return Promise.resolve({ data: { data: [{ id: 'payment-term-id', name: '30 dias' }] } });
      if (url === '/api/v1/cost-centers') return Promise.resolve({ data: { data: [{ id: 'cost-center-id', name: 'Oficina' }] } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const authValue: AuthContextValue = {
  session: {
    accessToken: 'access',
    refreshToken: 'refresh',
    user: {
      id: 'user-id',
      fullName: 'Operador Master',
      email: 'master@example.com',
      isMaster: true,
      roles: ['MASTER'],
      permissions: [],
    },
  },
  initializing: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <XmlImportsListPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('XmlImportsListPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); requests.params.length = 0; });
  it('renders imported XML rows with branch classification and actions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'XMLs Importados' })).toBeInTheDocument();
    expect(await screen.findByText('Auto Peças Centro Ltda')).toBeInTheDocument();
    expect(screen.getByText('30/09/2026, 21:24')).toBeInTheDocument();
    expect(screen.getAllByText('Filial').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 980,50').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Importar XML' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Gerar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('filters by issue dates only and clears the period', async () => {
    renderPage();
    await screen.findByText('Auto Peças Centro Ltda');
    expect(screen.getByText('Período de emissão')).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-30' } });
    await waitFor(() => expect(requests.params.at(-1)).toMatchObject({ issueFrom: '2026-09-01', issueTo: '2026-09-30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(requests.params.at(-1)).toMatchObject({ issueFrom: undefined, issueTo: undefined }));
    expect(screen.getByLabelText('Data inicial')).toHaveValue('');
    expect(screen.getByLabelText('Data final')).toHaveValue('');
  });

  it('prefills generate dialog from company parameters', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Gerar conta a pagar do XML' });

    await waitFor(() => expect(within(dialog).getByLabelText('Categoria')).toHaveValue('category-id'));
    expect(within(dialog).getByLabelText('Tipo de documento')).toHaveValue('document-type-id');
    expect(within(dialog).getByLabelText('Forma de pagamento')).toHaveValue('payment-method-id');
    expect(within(dialog).getByLabelText('Condição de pagamento')).toHaveValue('payment-term-id');
    expect(within(dialog).getByLabelText('Centro de custo')).toHaveValue('cost-center-id');
    expect(within(dialog).getByRole('button', { name: 'Gerar conta' })).toBeEnabled();
  });
});
