// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoundationPage } from './foundation-page';

const mocks = vi.hoisted(() => ({
  get: vi.fn((url: string, config?: { params?: Record<string, unknown> }) => {
    void config;
    if (url === '/api/v1/dashboard') {
      return Promise.resolve({
        data: {
          summary: { totalPayable: '1000.00', overdue: '100.00', today: '250.00', todayCount: '2', upcoming: '900.00', paid: '300.00' },
          dueSeries: [],
          categories: [],
          upcoming: [],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  }),
}));

vi.mock('../api/http-client', () => ({
  httpClient: {
    get: mocks.get,
  },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FoundationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastDashboardParams(): Record<string, unknown> | undefined {
  return [...mocks.get.mock.calls].reverse().find(([url]) => url === '/api/v1/dashboard')?.[1]?.params;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FoundationPage', () => {
  it('uses dashboard summary for due today and sends month filters as date ranges', async () => {
    renderPage();

    expect(await screen.findByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByText('2 documentos')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mês inicial'), { target: { value: '2026-01' } });
    fireEvent.change(screen.getByLabelText('Mês final'), { target: { value: '2026-06' } });

    await waitFor(() => expect(lastDashboardParams()?.from).toBe('2026-01-01'));
    expect(lastDashboardParams()?.to).toBe('2026-06-30');
  });
});
