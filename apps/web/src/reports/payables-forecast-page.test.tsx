// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { PayablesForecastPage } from './payables-forecast-page';
import { rangeForForecastPreset } from './payables-forecast-periods';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string, config?: { params?: Record<string, unknown> }) => {
    void config;
    if (url === '/api/v1/reports/payables-forecast') return Promise.resolve({ data: {
      summary: { totalPending: '2500.00', overdue: '400.00', upcoming: '2100.00', installmentCount: '3', companyCount: '2' },
      byDate: [{ label: '2026-09-21', amount: '2500.00', count: '3' }],
      byCompany: [{ id: 'company-a', label: 'Empresa A', amount: '2500.00', count: '3' }],
      data: [{ id: 'installment-a', payableTitleId: 'title-a', documentNumber: 'NF-100', description: 'Compra', supplierName: 'Fornecedor A', companyName: 'Empresa A', categoryName: 'Compras', installmentNumber: 1, installmentCount: 2, dueDate: '2026-09-21', openBalance: '2500.00', status: 'UPCOMING' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    } });
    return Promise.resolve({ data: { data: [] } });
  }),
}));

vi.mock('../api/http-client', () => ({ httpClient: { get: mocks.get } }));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const session = { accessToken: 'access', refreshToken: 'refresh', user: { id: 'user-a', fullName: 'Usuário', email: 'user@example.com', isMaster: false, roles: [], permissions: ['PAYABLE_TITLE_VIEW'], companies: [{ id: 'company-a', legalName: 'Empresa A Ltda', tradeName: 'Empresa A', documentNumber: '123', companyType: 'MAIN' as const, isDefault: true, accessScope: 'OPERATIONAL' as const }], defaultCompanyId: 'company-a' } };
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session, initializing: false, signIn: vi.fn(), signOut: vi.fn() }}><MemoryRouter><PayablesForecastPage /></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PayablesForecastPage', () => {
  it('calculates next week from Monday through Sunday', () => {
    expect(rangeForForecastPreset('NEXT_WEEK', new Date(2026, 8, 17))).toEqual({ from: '2026-09-21', to: '2026-09-27' });
  });

  it('renders forecast totals and filters by an allowed company', async () => {
    renderPage();
    expect((await screen.findAllByText('R$ 2.500,00')).length).toBeGreaterThan(0);
    expect(screen.getByText('NF-100')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Empresa A' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar painel' }));
    expect(screen.getByLabelText('Empresa').closest('div.hidden')).not.toBeNull();
    expect(screen.getByText(/Painel recolhido/)).toBeInTheDocument();
    expect(screen.getByText('NF-100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exibir painel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    await waitFor(() => {
      const reportCall = [...mocks.get.mock.calls].reverse().find(([url]) => url === '/api/v1/reports/payables-forecast');
      expect(reportCall?.[1]?.params).toMatchObject({ from: '2026-09-21', to: '2026-09-27' });
    });
  });
});
