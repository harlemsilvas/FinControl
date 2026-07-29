import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/http-client';
import { resetPassword } from '../auth/auth-service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const schema = z.object({
  password: z.string().min(8, 'A senha deve possuir pelo menos 8 caracteres.'),
  confirmation: z.string().min(8, 'Confirme a nova senha.'),
}).refine((value) => value.password === value.confirmation, {
  path: ['confirmation'],
  message: 'As senhas informadas precisam ser iguais.',
});

type Values = z.infer<typeof schema>;

export function PasswordResetPage(): ReactElement {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [serverError, setServerError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (values) => {
    setServerError(undefined);
    setSuccess(undefined);
    try {
      const result = await resetPassword(token, values.password);
      setSuccess(result.message);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Não foi possível redefinir a senha.');
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-teal-700">FinControl</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Redefinir senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Informe uma nova senha para concluir a recuperação de acesso.</p>

        {!token ? (
          <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Link de recuperação inválido ou incompleto.
          </div>
        ) : success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={(event) => void submit(event)}>
            <Input label="Nova senha" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
            <Input label="Confirmar senha" type="password" autoComplete="new-password" error={errors.confirmation?.message} {...register('confirmation')} />
            {serverError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</div> : null}
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar nova senha'}</Button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm font-bold text-teal-700 hover:underline">Voltar para o login</Link>
      </section>
    </main>
  );
}
