// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http-client';
import { PayableFormPage } from './payable-form-page';

const mocks = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { id: 'payable-created' } })),
  patch: vi.fn(),
  get: vi.fn((url: string) => {
    if (url === '/api/v1/payables/payable-1') {
      return Promise.resolve({
        data: {
          id: 'payable-1',
          supplierId: 'supplier-1',
          companyId: 'company-1',
          companyName: 'HRM Motos Matriz',
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
          installments: [
            { id: 'inst-1', installmentNumber: 1, installmentCount: 2, amount: '1000.00', openBalance: '0.00', dueDate: '2026-08-05', paymentMethodId: 'payment-method-1', statusCode: 'PAID' },
            { id: 'inst-2', installmentNumber: 2, installmentCount: 2, amount: '1500.00', openBalance: '1500.00', dueDate: '2026-09-05', paymentMethodId: 'payment-method-1', statusCode: 'OPEN' },
          ],
          approvals: [],
          attachments: [],
          tags: [],
          payments: [],
        },
      });
    }
    if (url === '/api/v1/recurrences/rec-1') return Promise.resolve({ data: { id: 'rec-1', companyId: 'company-1', supplierId: 'supplier-1', categoryId: 'category-1', costCenterId: 'cost-center-1', documentTypeId: 'document-type-1', paymentMethodId: 'payment-method-1', paymentTermId: 'payment-term-1', description: 'Aluguel recorrente', baseDocumentNumber: 'ALUGUEL', baseAmount: '2500.00', frequencyCode: 'MONTHLY', startDate: '2026-08-05', endDate: null, maxOccurrences: null, dueDay: 5, isOpenEnded: false, notes: '' } });
    if (url === '/api/v1/recurrences/rec-1/cancellation-preview') return Promise.resolve({ data: { recurrenceId: 'rec-1', titles: [], total: 0 } });
    if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-1', legalName: 'HRM Motos Matriz' }], page: 1, pageSize: 100, total: 1 } });
    if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [{ id: 'supplier-1', legalName: 'Fornecedor Manual' }], page: 1, pageSize: 100, total: 1 } });
    if (url === '/api/v1/financial-categories') return Promise.resolve({ data: { data: [{ id: 'category-1', name: 'Despesas Fixas' }], page: 1, pageSize: 100, total: 1 } });
    if (url === '/api/v1/document-types') return Promise.resolve({ data: { data: [{ id: 'document-type-boleto', code: 'BOLETO', name: 'Boleto' }], page: 1, pageSize: 100, total: 1 } });
    if (url === '/api/v1/payment-methods') return Promise.resolve({ data: { data: [{ id: 'payment-method-boleto', code: 'BOLETO', name: 'Boleto' }], page: 1, pageSize: 100, total: 1 } });
    return Promise.resolve({ data: { data: [], page: 1, pageSize: 100, total: 0 } });
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
  httpClient: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
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
    expect(await screen.findByLabelText(/Empresa/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.queryByLabelText('Forma de Pagamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Ocorrência')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Impostos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovações' })).not.toBeInTheDocument();
  });

  it('creates a manual payable with boleto defaults and generated description when optional fields are empty', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/payables/new']}>
          <Routes>
            <Route path="/payables/new" element={<PayableFormPage />} />
            <Route path="/payables/:id" element={<div>saved</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole('option', { name: 'HRM Motos Matriz' });
    await screen.findByRole('option', { name: 'Fornecedor Manual' });
    await screen.findByRole('option', { name: 'Despesas Fixas' });
    await screen.findByRole('option', { name: 'Boleto' });

    fireEvent.change(screen.getByLabelText(/Empresa/), { target: { value: 'company-1' } });
    fireEvent.change(screen.getByLabelText(/Fornecedor/), { target: { value: 'supplier-1' } });
    fireEvent.change(screen.getByLabelText(/Vencimento/), { target: { value: '2026-08-08' } });
    fireEvent.change(screen.getByLabelText(/Valor/), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText(/Nº do Documento/), { target: { value: 'DOC-001' } });
    fireEvent.change(await screen.findByLabelText(/Categoria/), { target: { value: 'category-1' } });
    await waitFor(() => expect(screen.getAllByText('R$ 150,00').length).toBeGreaterThan(1));
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/payables', expect.objectContaining({ documentTypeId: 'document-type-boleto' })));
    const calls = mocks.post.mock.calls as unknown as Array<[string, { description: string; installments: Array<{ paymentMethodId: string; dueDate: string }> }]>;
    const payload = calls[0]![1];
    expect(payload.description).toBe('HRM Motos Matriz - Fornecedor Manual - DOC-001 - 08/08/2026');
    expect(payload.installments[0]?.paymentMethodId).toBe('payment-method-boleto');
    expect(payload.installments[0]?.dueDate).toBe('2026-08-08');
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

  it('locks due date and amount on the main data tab when editing an existing payable', async () => {
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
    expect(screen.getByTitle('Altere o vencimento pela aba Parcelas.')).toBeDisabled();
    expect(screen.getByTitle('Altere o valor pela aba Parcelas.')).toBeDisabled();
    expect(screen.getByText(/ajuste esses dados diretamente na aba Parcelas/i)).toBeTruthy();
  });

  it('translates paid title immutable errors while explaining the safe path', async () => {
    mocks.patch.mockRejectedValueOnce(new ApiError(409, 'PAID_TITLE_IMMUTABLE', 'Financial fields cannot change while effective payments exist'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

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
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);

    expect(await screen.findByText(/Este título já possui pagamento efetivo/i)).toBeTruthy();
    expect(screen.getByText(/estorne o pagamento primeiro/i)).toBeTruthy();
  });

  it('locks paid installments visually and skips their update request', async () => {
    mocks.patch.mockResolvedValue({ data: { id: 'updated' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

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
    fireEvent.click(screen.getByRole('button', { name: 'Parcelas' }));
    expect(await screen.findByText('Parcela paga - edição bloqueada')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('1.500,00'), { target: { value: '150300' } });
    fireEvent.change(screen.getByDisplayValue('2026-09-05'), { target: { value: '2026-09-15' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/api/v1/payables/payable-1', expect.objectContaining({ originalAmount: 2503 })));
    expect(mocks.patch).toHaveBeenCalledWith('/api/v1/payables/payable-1/installments', {
      installments: [
        expect.objectContaining({ id: 'inst-1', amount: 1000, dueDate: '2026-08-05' }),
        expect.objectContaining({ id: 'inst-2', amount: 1503, dueDate: '2026-09-15' }),
      ],
    });
  });
});

describe('Payable cancellation', () => {
  afterEach(() => vi.restoreAllMocks());

  function renderEdit(client: QueryClient): void {
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/payables/payable-1']}><Routes>
      <Route path="/payables/:id" element={<PayableFormPage />} />
      <Route path="/payables" element={<div>Lista atualizada</div>} />
    </Routes></MemoryRouter></QueryClientProvider>);
  }

  it('invalidates a still fresh agenda and financial summaries after cancellation', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 }, mutations: { retry: false } } });
    const keys = ['agenda', 'agenda-dashboard', 'dashboard', 'payables-forecast', 'payment-eligible-installments', 'planned-vs-paid', 'payables', 'payable', 'recurrences'];
    for (const key of keys) client.setQueryData([key, 'cached-period'], { count: 2 });
    client.setQueryData(['suppliers'], { count: 1 });
    vi.spyOn(window, 'prompt').mockReturnValue('  Lançamento duplicado  ');
    renderEdit(client);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar título' }));
    await screen.findByText('Lista atualizada');
    expect(mocks.post).toHaveBeenCalledWith('/api/v1/payables/payable-1/cancel', { reason: 'Lançamento duplicado' });
    for (const key of keys) expect(client.getQueryState([key, 'cached-period'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['suppliers'])?.isInvalidated).toBe(false);
  });

  it('keeps the form open and explains rejection when effective payments exist', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    mocks.post.mockRejectedValueOnce(new ApiError(409, 'TITLE_HAS_PAYMENTS', 'Reverse effective payments before cancellation'));
    vi.spyOn(window, 'prompt').mockReturnValue('Duplicado');
    renderEdit(client);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar título' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Estorne o pagamento antes de cancelar');
    expect(screen.queryByText('Lista atualizada')).toBeNull();
  });

  it('does not submit when the justification prompt is dismissed', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    renderEdit(client);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar título' }));
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe('Return after editing a payable', () => {
  it('returns to the supplied origin after a successful save', async () => {
    mocks.patch.mockResolvedValue({ data: { id: 'payable-1' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[{
      pathname: '/payables/payable-1', state: { returnTo: '/reports?period=month' },
    }]}><Routes>
      <Route path="/payables/:id" element={<PayableFormPage />} />
      <Route path="/reports" element={<div>Relatório de origem</div>} />
    </Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByRole('heading', { name: 'Editar Conta a Pagar' });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);
    await screen.findByText('Relatório de origem');
  });

  it('returns to the accounts list when a direct edit has no origin', async () => {
    mocks.patch.mockResolvedValue({ data: { id: 'payable-1' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/payables/payable-1']}><Routes>
      <Route path="/payables/:id" element={<PayableFormPage />} />
      <Route path="/payables" element={<div>Contas de origem</div>} />
    </Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByRole('heading', { name: 'Editar Conta a Pagar' });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);
    await screen.findByText('Contas de origem');
  });
});
