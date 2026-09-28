// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { PaymentsReportPage } from './payments-report-page';

const mocks = vi.hoisted(() => ({ get: vi.fn((url: string) => {
  if (url === '/api/v1/reports/payments') return Promise.resolve({ data: {
    summary: { totalPaid: '103.00', totalPrincipal: '100.00', totalAdjustments: '3.00', paymentCount: '1', companyCount: '1' },
    byDate: [{ label: '2026-09-20', amount: '103.00', count: '1' }],
    byCompany: [{ id: 'company-a', label: 'Empresa A', amount: '103.00', count: '1' }],
    data: [{ id: 'payment-a', paymentDate: '2026-09-20', movementAmount: '103.00', principalAmount: '100.00', interestAmount: '3.00', penaltyAmount: '0.00', additionalAmount: '0.00', discountAmount: '0.00', transactionNumber: null, payableTitleId: 'title-a', documentNumber: 'NF-100', description: 'Compra', supplierName: 'Fornecedor A', companyName: 'Empresa A', categoryName: 'Compras', paymentMethodName: 'Boleto', bankAccountName: 'Conta A', installmentNumber: 1, installmentCount: 1 }],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  } });
  return Promise.resolve({ data: { data: [] } });
}) }));
vi.mock('../api/http-client', () => ({ httpClient: { get: mocks.get } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PaymentsReportPage', () => {
  it('shows paid amounts and filters by payment date and company', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = { accessToken: 'access', refreshToken: 'refresh', user: { id: 'user-a', fullName: 'Usuário', email: 'user@example.com', isMaster: false, roles: [], permissions: ['PAYABLE_TITLE_VIEW'], companies: [{ id: 'company-a', legalName: 'Empresa A Ltda', tradeName: 'Empresa A', documentNumber: '123', companyType: 'MAIN' as const, isDefault: true, accessScope: 'OPERATIONAL' as const }], defaultCompanyId: 'company-a' } };
    render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session, initializing: false, signIn: vi.fn(), signOut: vi.fn() }}><MemoryRouter><PaymentsReportPage /></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
    expect((await screen.findAllByText('R$ 103,00')).length).toBeGreaterThan(0);
    expect(screen.getByText('NF-100')).toBeInTheDocument();
    expect(screen.getByText(/Estornos não entram nos totais/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'company-a' } });
    await waitFor(() => {
      const calls = mocks.get.mock.calls as Array<[string, { params?: Record<string, unknown> }?]>;
      expect(calls.some(([url, config]) => url === '/api/v1/reports/payments' && config?.params?.companyId === 'company-a')).toBe(true);
    });
  });
});
