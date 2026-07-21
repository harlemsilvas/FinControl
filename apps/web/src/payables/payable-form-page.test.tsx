import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PayableFormPage } from './payable-form-page';

vi.mock('../api/http-client', () => ({
  ApiError: class ApiError extends Error {
    code?: string;
  },
  httpClient: {
    get: vi.fn(() => Promise.resolve({ data: { data: [], page: 1, pageSize: 100, total: 0 } })),
    post: vi.fn(),
    patch: vi.fn(),
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

    expect(await screen.findByRole('heading', { name: 'Nova Conta a Pagar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });
});