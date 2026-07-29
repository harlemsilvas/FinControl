import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { requestPasswordReset } from '../auth/auth-service';
import { FinControlMark } from '../components/brand/fincontrol-mark';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve possuir pelo menos 8 caracteres.'),
});
const recoverySchema = z.object({ email: z.email('Informe um e-mail válido.') });
type Values = z.infer<typeof schema>;
type RecoveryValues = z.infer<typeof recoverySchema>;

export function LoginPage(): ReactElement {
  const auth = useAuth();
  const { session } = auth;
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string>();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string>();
  const [recoveryError, setRecoveryError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<Values>({ resolver: zodResolver(schema) });
  const recovery = useForm<RecoveryValues>({ resolver: zodResolver(recoverySchema) });

  if (session) return <Navigate to="/" replace />;

  const submit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await auth.signIn(values.email, values.password);
      const state = location.state as { from?: string } | null;
      await navigate(state?.from ?? '/', { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.');
    }
  });

  const submitRecovery = recovery.handleSubmit(async (values) => {
    setRecoveryError(undefined);
    setRecoveryMessage(undefined);
    try {
      const result = await requestPasswordReset(values.email);
      setRecoveryMessage(result.message);
    } catch (error) {
      setRecoveryError(error instanceof ApiError ? error.message : 'Não foi possível solicitar a recuperação.');
    }
  });

  function openRecovery(): void {
    recovery.reset({ email: getValues('email') || '' });
    setRecoveryMessage(undefined);
    setRecoveryError(undefined);
    setRecoveryOpen(true);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold"><FinControlMark className="size-11 bg-white/10" />FinControl</div>
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-teal-200">ERP Financeiro</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight">Controle financeiro com rastreabilidade de ponta a ponta.</h1>
          <p className="mt-6 text-lg leading-8 text-teal-50/80">Cadastros, contas a pagar, aprovações e pagamentos em uma base segura e auditável.</p>
        </div>
        <p className="text-sm text-teal-100/60">FinControl • Ambiente seguro</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-xl font-bold lg:hidden"><FinControlMark className="size-10 bg-teal-950/10" />FinControl</div>
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">Bem-vindo</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Acesse sua conta</h2>
          <p className="mt-3 text-slate-600">Use as credenciais fornecidas pelo Operador Master.</p>
          <form className="mt-8 grid gap-5" onSubmit={(event) => void submit(event)}>
            <Input label="E-mail" type="email" autoComplete="username" placeholder="voce@empresa.com" error={errors.email?.message} {...register('email')} />
            <Input label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
            <button type="button" className="-mt-2 justify-self-end text-sm font-bold text-teal-700 hover:underline" onClick={openRecovery}>Esqueci minha senha</button>
            {serverError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</div> : null}
            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">{isSubmitting ? 'Entrando...' : 'Entrar'}</Button>
          </form>
        </div>
      </section>

      {recoveryOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Recuperar senha">
          <form className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onSubmit={(event) => void submitRecovery(event)}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Recuperar senha</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Informe seu e-mail. Se ele estiver ativo, enviaremos instruções para redefinir o acesso.</p>
              </div>
              <button type="button" className="text-2xl text-slate-400" onClick={() => setRecoveryOpen(false)} aria-label="Fechar">×</button>
            </div>
            <Input label="E-mail de recuperação" type="email" autoComplete="username" error={recovery.formState.errors.email?.message} {...recovery.register('email')} />
            {recoveryMessage ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{recoveryMessage}</p> : null}
            {recoveryError ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{recoveryError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setRecoveryOpen(false)}>Fechar</Button>
              <Button type="submit" disabled={recovery.formState.isSubmitting}>{recovery.formState.isSubmitting ? 'Solicitando...' : 'Enviar recuperação'}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
