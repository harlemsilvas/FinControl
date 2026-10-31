// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { PlannedVsPaidPage } from './planned-vs-paid-page';
import { rangeForForecastPreset } from './payables-forecast-periods';

const mocks = vi.hoisted(() => ({ get: vi.fn((url: string) => {
  if (url === '/api/v1/reports/planned-vs-paid') return Promise.resolve({ data: {
    summary: { planned: '250.00', paid: '103.00', difference: '-147.00', installmentCount: '2', paymentCount: '1', companyCount: '1' },
    byDate: [{ label: '2026-09-20', planned: '250.00', paid: '103.00', difference: '-147.00', installmentCount: '2', paymentCount: '1' }],
    byCompany: [{ id: 'company-a', label: 'Empresa A', planned: '250.00', paid: '103.00', difference: '-147.00', installmentCount: '2', paymentCount: '1' }],
  } });
  return Promise.resolve({ data: { data: [] } });
}) }));
vi.mock('../api/http-client', () => ({ httpClient: { get: mocks.get } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PlannedVsPaidPage', () => {
  it('explains the independent periods and filters the comparison by company', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = { accessToken: 'access', refreshToken: 'refresh', user: { id: 'user-a', fullName: 'Usuário', email: 'user@example.com', isMaster: false, roles: [], permissions: ['PAYABLE_TITLE_VIEW'], companies: [{ id: 'company-a', legalName: 'Empresa A Ltda', tradeName: 'Empresa A', documentNumber: '123', companyType: 'MAIN' as const, isDefault: true, accessScope: 'OPERATIONAL' as const }], defaultCompanyId: 'company-a' } };
    render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session, initializing: false, signIn: vi.fn(), signOut: vi.fn() }}><MemoryRouter><PlannedVsPaidPage /></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
    expect((await screen.findAllByText('R$ 250,00')).length).toBeGreaterThan(0);
    expect(screen.getByText(/não representa saldo em atraso/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'company-a' } });
    await waitFor(() => {
      const calls = mocks.get.mock.calls as Array<[string, { params?: Record<string, unknown> }?]>;
      expect(calls.some(([url, config]) => url === '/api/v1/reports/planned-vs-paid' && config?.params?.companyId === 'company-a')).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    await waitFor(() => {
      const calls = mocks.get.mock.calls as Array<[string, { params?: Record<string, unknown> }?]>;
      const expected = rangeForForecastPreset('NEXT_WEEK');
      expect(calls.some(([url, config]) => url === '/api/v1/reports/planned-vs-paid' && config?.params?.from === expected.from && config.params.to === expected.to)).toBe(true);
    });
  });
});
