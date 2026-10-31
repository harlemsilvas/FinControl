// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './toast';
import { useToast } from './toast-context';

function ToastTrigger(): ReactElement {
  const { showToast } = useToast();
  return <button type="button" onClick={() => showToast({ type: 'success', title: 'Salvo com sucesso', description: 'A operação foi concluída.' })}>Mostrar toast</button>;
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows and dismisses a toast notification', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar toast' }));

    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso');
    expect(screen.getByText('A operação foi concluída.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(screen.queryByText('Salvo com sucesso')).not.toBeInTheDocument();
  });
});
