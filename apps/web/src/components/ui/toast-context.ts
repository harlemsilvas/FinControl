import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface ToastInput {
  type?: ToastType;
  title: string;
  description?: string;
}

export interface ToastContextValue {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => '',
  dismissToast: () => undefined,
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
