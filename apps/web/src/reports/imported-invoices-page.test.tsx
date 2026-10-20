// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { ImportedInvoicesPage } from './imported-invoices-page';
import { invoiceMonthRange } from './imported-invoices-types';

const mocks = vi.hoisted(() => ({ get: vi.fn((url: string, _config?: unknown) => {
  void _config;
  if (url === '/api/v1/reports/imported-invoices') return Promise.resolve({ data: {
    summary: { noteCount: 2, invoiceAmount: '24.68', companyCount: 1, availableCount: 1 },
    byCompany: [{ companyId: 'company-a', companyName: 'Empresa A', noteCount: 2, invoiceAmount: '24.68' }],
    data: [{ id: 'note-a', companyId: 'company-a', companyName: 'Empresa A', companyDocument: '123', documentNumber: '26466', documentSeries: '1', issueDate: '2026-09-29', supplierName: 'Fornecedor A', supplierDocument: '456', accessKey: null, invoiceAmount: '12.34', xmlAvailable: true }],
    page: 1, pageSize: 20, limits: { maxNotes: 500, maxBytes: 20971520, retentionHours: 48 },
  } });
  return Promise.resolve({ data: { data: [], total: 0 } });
}), post: vi.fn((url: string, _body?: unknown) => { void _body; return Promise.resolve({ data: { id: 'package-a', createdAt: '2026-10-20T12:00:00Z', expiresAt: '2099-10-22T12:00:00Z', status: url.endsWith('generate') ? 'READY' : 'PREVIEW', filters: { from: '2026-09-01', to: '2026-09-30' }, companyIds: ['company-a'], totalCount: 2, includedCount: 1, unavailableCount: 1, sourceBytes: 200, archiveBytes: 123, sha256: 'hash', unavailable: [{ id: 'note-b', documentNumber: 'missing', reason: 'Conteúdo não armazenado.' }] } }); }), remove: vi.fn(() => Promise.resolve({})) }));
vi.mock('../api/http-client', () => ({ ApiError: class ApiError extends Error {}, httpClient: { get: mocks.get, post: mocks.post, delete: mocks.remove } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function renderPage(permissions: string[] = ['XML_REPORT_VIEW', 'XML_EXPORT_MANAGE']): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session: { accessToken: 'access', refreshToken: 'refresh', user: { id: 'user', fullName: 'Usuário', email: 'test@example.com', isMaster: false, roles: [], permissions, companies: [{ id: 'company-a', legalName: 'Empresa A', tradeName: null, documentNumber: '123', companyType: 'MAIN', isDefault: true, accessScope: 'OPERATIONAL' }] } }, initializing: false, signIn: vi.fn(), signOut: vi.fn() }}><MemoryRouter><ImportedInvoicesPage /></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
}
describe('Imported invoices page', () => {
  it('filters by company and clears selection on filter changes', async () => {
    renderPage();
    await screen.findByText('26466 / 1');
    fireEvent.click(screen.getByLabelText('Selecionar nota 26466'));
    expect(screen.getByRole('button', { name: 'Exportar selecionadas' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'company-a' } });
    await waitFor(() => expect(mocks.get.mock.calls.some(([url, config]) => url === '/api/v1/reports/imported-invoices' && (config as { params?: { companyId?: string } })?.params?.companyId === 'company-a')).toBe(true));
    expect(screen.getByRole('button', { name: 'Exportar selecionadas' })).toBeDisabled();
  });
  it('requires explicit partial confirmation and generates only after the user clicks', async () => {
    renderPage(); await screen.findByText('26466 / 1');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar XMLs' }));
    const dialog = await screen.findByRole('dialog', { name: 'Exportar XMLs' });
    const generate = await within(dialog).findByRole('button', { name: 'Gerar ZIP' });
    expect(generate).toBeDisabled();
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/generate'))).toBe(false);
    fireEvent.click(within(dialog).getByLabelText('Confirmo gerar somente os XMLs disponíveis.'));
    fireEvent.click(generate);
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/v1/xml-exports/package-a/generate', { allowPartial: true }));
    expect(await within(dialog).findByRole('button', { name: /Baixar ZIP/ })).toBeEnabled();
  });
  it('hides export controls for report-only users and refuses the page without report permission', async () => {
    renderPage(['XML_REPORT_VIEW']); await screen.findByText('26466 / 1');
    expect(screen.queryByRole('button', { name: 'Exportar XMLs' })).not.toBeInTheDocument();
    cleanup(); renderPage([]);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão');
  });
  it('computes month boundaries in São Paulo even when UTC is already the next month/year', () => {
    expect(invoiceMonthRange(false, new Date('2027-01-01T01:00:00Z'))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(invoiceMonthRange(true, new Date('2027-01-15T12:00:00Z'))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(invoiceMonthRange(true, new Date('2028-03-05T12:00:00Z'))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});
