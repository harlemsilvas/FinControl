import { useCallback, useEffect, useMemo, useState, type PropsWithChildren, type ReactElement } from 'react';
import { ToastContext, type ToastInput, type ToastMessage, type ToastType } from './toast-context';

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  error: 'border-red-200 bg-red-50 text-red-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-blue-200 bg-blue-50 text-blue-950',
};

const iconStyles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
};

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  warning: '!',
  info: 'i',
};

export function ToastProvider({ children }: PropsWithChildren): ReactElement {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, type: toast.type ?? 'info', title: toast.title, description: toast.description }].slice(-4));
    return id;
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(420px,calc(100vw-2rem))] gap-3" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }): ReactElement {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 6000);
    return (): void => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <div role={toast.type === 'error' ? 'alert' : 'status'} className={`pointer-events-auto rounded-2xl border p-4 shadow-xl shadow-slate-900/10 ${toastStyles[toast.type]}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-sm font-black ${iconStyles[toast.type]}`} aria-hidden="true">
          {icons[toast.type]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{toast.title}</p>
          {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
        </div>
        <button type="button" className="rounded-lg px-2 text-lg leading-none opacity-60 transition hover:bg-white/70 hover:opacity-100" aria-label="Fechar notificação" onClick={() => onDismiss(toast.id)}>
          ×
        </button>
      </div>
    </div>
  );
}
