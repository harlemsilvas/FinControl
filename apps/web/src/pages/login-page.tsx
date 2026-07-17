import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const schema=z.object({email:z.email('Informe um e-mail válido.'),password:z.string().min(8,'A senha deve possuir pelo menos 8 caracteres.')});type Values=z.infer<typeof schema>;
export function LoginPage():ReactElement{
  const auth=useAuth();const {session}=auth;const navigate=useNavigate();const location=useLocation();const [serverError,setServerError]=useState<string>();const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<Values>({resolver:zodResolver(schema)});
  if(session)return <Navigate to="/" replace/>;
  const submit=handleSubmit(async values=>{setServerError(undefined);try{await auth.signIn(values.email,values.password);const state=location.state as {from?:string}|null;await navigate(state?.from??'/',{replace:true});}catch(error){setServerError(error instanceof ApiError?error.message:'Não foi possível entrar. Tente novamente.');}});
  return <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]"><section className="hidden bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3 text-xl font-bold"><span className="grid size-11 place-items-center rounded-xl bg-white/15">FC</span>FinControl</div><div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-[0.25em] text-teal-200">ERP Financeiro</p><h1 className="mt-4 text-5xl font-bold leading-tight">Controle financeiro com rastreabilidade de ponta a ponta.</h1><p className="mt-6 text-lg leading-8 text-teal-50/80">Cadastros, contas a pagar, aprovações e pagamentos em uma base segura e auditável.</p></div><p className="text-sm text-teal-100/60">FinControl • Ambiente seguro</p></section><section className="flex items-center justify-center bg-slate-50 p-6"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 text-xl font-bold lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white">FC</span>FinControl</div><p className="text-sm font-bold uppercase tracking-widest text-teal-700">Bem-vindo</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Acesse sua conta</h2><p className="mt-3 text-slate-600">Use as credenciais fornecidas pelo Operador Master.</p><form className="mt-8 grid gap-5" onSubmit={event=>void submit(event)}><Input label="E-mail" type="email" autoComplete="username" placeholder="voce@empresa.com" error={errors.email?.message} {...register('email')}/><Input label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')}/>{serverError&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</div>}<Button type="submit" disabled={isSubmitting} className="mt-2 w-full">{isSubmitting?'Entrando…':'Entrar'}</Button></form></div></section></main>;
}
