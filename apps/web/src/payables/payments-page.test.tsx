import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsPage } from './payments-page';

const mocks = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { id: 'payment-id' } })),
}));

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message); }
  },
  httpClient: {
    get: vi.fn((url: string) => {
      if (url === '/api/v1/payable-installments/eligible-for-payment') {
        return Promise.resolve({
          data: {
            data: [{
              installmentId: 'installment-id',
              payableTitleId: 'title-id',
              companyId: 'company-id',
              companyName: 'ABC Center',
              supplierId: 'supplier-id',
              supplierName: 'CIA BRASILEIRA DIST AUTO S.A',
              categoryName: 'Mercadorias',
              documentNumber: '17026',
              documentSeries: '160',
              description: 'NFe 17026',
              installmentNumber: 1,
              installmentCount: 1,
              amount: '403.06',
              openBalance: '403.06',
              dueDate: '2026-07-20',
              paymentMethodId: 'payment-method-id',
              paymentMethodName: 'Boleto',
              installmentStatusCode: 'OPEN',
            }],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      }
      if (url === '/api/v1/bank-account-balances') {
        return Promise.resolve({
          data: {
            data: [{
              bankAccountId: 'bank-account-id',
              accountName: 'Conta Matriz',
              bankName: 'Banco Teste',
              companyId: 'company-id',
              companyName: 'ABC Center',
              officialBalance: '1000.00',
            }],
            page: 1,
            pageSize: 100,
            total: 1,
          },
        });
      }
      if (url === '/api/v1/payments') {
        return Promise.resolve({
          data: {
            data: [{
              id: 'payment-id',
              paymentDate: '2026-07-22',
              movementAmount: '403.06',
              principalAmount: '403.06',
              statusCode: 'EFFECTIVE',
              isReversed: false,
              supplierName: 'CIA BRASILEIRA DIST AUTO S.A',
              companyName: 'ABC Center',
              documentNumber: '17026',
              documentSeries: '160',
              description: 'NFe 17026',
              installmentNumber: 1,
              installmentCount: 1,
              bankName: 'Banco Teste',
              accountName: 'Conta Matriz',
              paymentMethodName: 'Boleto',
            }],
            page: 1,
            pageSize: 10,
            total: 1,
          },
        });
      }
      if (url === '/api/v1/payments/payment-id') {
        return Promise.resolve({
          data: {
            id: 'payment-id',
            payableInstallmentId: 'installment-id',
            payableTitleId: 'title-id',
            paymentDate: '2026-07-22',
            movementAmount: '403.06',
            principalAmount: '403.06',
            interestAmount: '0.00',
            penaltyAmount: '0.00',
            discountAmount: '0.00',
            additionalAmount: '0.00',
            statusCode: 'EFFECTIVE',
            isReversed: false,
            supplierName: 'CIA BRASILEIRA DIST AUTO S.A',
            companyName: 'ABC Center',
            documentNumber: '17026',
            documentSeries: '160',
            description: 'NFe 17026',
            installmentNumber: 1,
            installmentCount: 1,
            installmentAmount: '403.06',
            installmentOpenBalance: '0.00',
            dueDate: '2026-07-20',
            bankName: 'Banco Teste',
            accountName: 'Conta Matriz',
            paymentMethodName: 'Boleto',
            categoryName: 'Mercadorias',
            costCenterName: 'Marketplace',
            transactionNumber: 'TX-1',
            overpaymentConfirmed: false,
            createdAt: '2026-07-22T17:46:00.000Z',
            bankMovements: [{
              id: 'movement-id',
              movementType: 'PAYABLE_PAYMENT',
              direction: 'OUT',
              movementDate: '2026-07-22',
              amount: '403.06',
              description: 'Pagamento 17026/160 1/1 - CIA BRASILEIRA DIST AUTO S.A',
              bankName: 'Banco Teste',
              accountName: 'Conta Matriz',
            }],
            attachments: [{ id: 'attachment-id', originalName: 'comprovante.pdf', mimeType: 'application/pdf', createdAt: '2026-07-22T17:47:00.000Z' }],
          },
        });
      }
      if (url === '/api/v1/payment-methods') return Promise.resolve({ data: { data: [{ id: 'payment-method-id', name: 'Boleto' }] } });
      if (url === '/api/v1/companies') return Promise.resolve({ data: { data: [{ id: 'company-id', legalName: 'ABC Center' }] } });
      if (url === '/api/v1/suppliers') return Promise.resolve({ data: { data: [{ id: 'supplier-id', legalName: 'CIA BRASILEIRA DIST AUTO S.A' }] } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: mocks.post,
  },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentsPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.post.mockClear();
  });

  it('renders eligible installments and posts an individual payment settlement', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Baixa de Pagamentos' })).toBeInTheDocument();
    expect((await screen.findAllByText('CIA BRASILEIRA DIST AUTO S.A')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 403,06').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Baixar parcela' });

    await waitFor(() => expect(within(dialog).getByLabelText('Conta bancária')).toHaveTextContent('Conta Matriz'));
    fireEvent.change(within(dialog).getByLabelText('Conta bancária'), { target: { value: 'bank-account-id' } });
    expect(within(dialog).getByLabelText('Forma de pagamento')).toHaveValue('payment-method-id');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar baixa' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/payments', expect.objectContaining({
      installmentId: 'installment-id',
      bankAccountId: 'bank-account-id',
      paymentMethodId: 'payment-method-id',
      principalAmount: 403.06,
    })));
  });

  it('posts an initial cash balance movement', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Lançar saldo inicial' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lançar saldo inicial' });

    await waitFor(() => expect(within(dialog).getByLabelText('Conta para saldo inicial')).toHaveTextContent('Conta Matriz'));
    fireEvent.change(within(dialog).getByLabelText('Conta para saldo inicial'), { target: { value: 'bank-account-id' } });
    fireEvent.change(within(dialog).getByLabelText('Valor inicial'), { target: { value: '1500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lançar saldo' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/bank-account-movements/manual-entry', expect.objectContaining({
      bankAccountId: 'bank-account-id',
      movementType: 'CASH_BALANCE',
      amount: 1500,
    })));
  });

  it('opens payment history reversal dialog and posts the reason', async () => {
    renderPage();

    expect(await screen.findByText('Pagamentos realizados')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Estornar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Estornar pagamento' });
    fireEvent.change(within(dialog).getByLabelText('Motivo do estorno'), { target: { value: 'Pagamento lançado em duplicidade' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar estorno' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/payments/payment-id/reverse', { reason: 'Pagamento lançado em duplicidade' }));
  });

  it('opens payment detail with treasury movement and attachment trail', async () => {
    renderPage();

    expect(await screen.findByText('Pagamentos realizados')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver' }));

    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do pagamento' });
    expect(await within(dialog).findByText('Movimentos de tesouraria')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento 17026/160 1/1 - CIA BRASILEIRA DIST AUTO S.A')).toBeInTheDocument();
    expect(within(dialog).getByText('comprovante.pdf')).toBeInTheDocument();
  });

  it('uploads a payment receipt from payment detail', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver' }));
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do pagamento' });
    const file = new File(['receipt'], 'novo-comprovante.pdf', { type: 'application/pdf' });
    fireEvent.change(await within(dialog).findByLabelText('Arquivo do comprovante'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Anexar comprovante' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/payments/payment-id/attachments', expect.any(FormData)));
  });
});
