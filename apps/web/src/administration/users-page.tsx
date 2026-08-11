import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type ActiveFilter = 'active' | 'inactive' | 'all';

interface RoleOption { id: string; code: string; name: string }
interface CompanyOption { id: string; legalName?: string; tradeName?: string | null; name?: string }
interface UserCompany { companyId: string; companyName: string; isDefault: boolean; accessScope: 'OPERATIONAL' | 'VIEW_ONLY' }
interface UserRow {
  id: string;
  fullName: string;
  email: string;
  isMaster: boolean;
  isActive: boolean;
  roles: RoleOption[];
  roleIds: string[];
  companies: UserCompany[];
}
interface ListResponse { data: UserRow[]; page: number; pageSize: number; total: number }
interface FormState {
  id?: string;
  fullName: string;
  email: string;
  password: string;
  isMaster: boolean;
  isActive: boolean;
  roleIds: string[];
  companies: UserCompany[];
}

const emptyForm: FormState = { fullName: '', email: '', password: '', isMaster: false, isActive: true, roleIds: [], companies: [] };

function activeParam(filter: ActiveFilter): boolean | undefined {
  if (filter === 'active') return true;
  if (filter === 'inactive') return false;
  return undefined;
}

function companyLabel(company: CompanyOption): string {
  return company.tradeName || company.legalName || company.name || company.id;
}

function roleLabel(user: UserRow): string {
  if (user.isMaster) return 'Master';
  return user.roles.map((role) => role.name).join(', ') || 'Sem perfil';
}

function companiesLabel(user: UserRow): string {
  if (user.isMaster && user.companies.length === 0) return 'Todas as empresas';
  return user.companies.map((company) => company.companyName).join(', ') || 'Sem empresa';
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof ApiError ? error.message : error ? 'Não foi possível salvar o usuário.' : undefined;
}

export function UsersPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [form, setForm] = useState<FormState | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string>();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const currentUserId = auth.session?.user.id;

  const users = useQuery({
    queryKey: ['users', page, search, activeFilter],
    queryFn: async () => (await httpClient.get<ListResponse>('/api/v1/users', {
      params: { page, pageSize: 20, search: search || undefined, active: activeParam(activeFilter) },
    })).data,
  });
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await httpClient.get<RoleOption[]>('/api/v1/roles')).data,
    staleTime: 60000,
  });
  const companies = useQuery({
    queryKey: ['user-companies-options'],
    queryFn: async () => (await httpClient.get<{ data: CompanyOption[] }>('/api/v1/companies', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const isSelfEdit = values.id === currentUserId;
      const payload: Record<string, unknown> = {
        fullName: values.fullName,
        email: values.email,
        password: values.password || undefined,
      };
      if (!isSelfEdit) {
        payload.isMaster = values.isMaster;
        payload.isActive = values.isActive;
        payload.roleIds = values.roleIds;
        payload.companies = values.companies.map(({ companyId, isDefault, accessScope }) => ({ companyId, isDefault, accessScope }));
      }
      return values.id ? httpClient.patch(`/api/v1/users/${values.id}`, payload) : httpClient.post('/api/v1/users', payload);
    },
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: async (user: UserRow) => httpClient.delete(`/api/v1/users/${user.id}`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const reactivate = useMutation({
    mutationFn: async (user: UserRow) => httpClient.post(`/api/v1/users/${user.id}/reactivate`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const requestPasswordReset = useMutation({
    mutationFn: async (userId: string) => (await httpClient.post<{ message: string; emailStatus: string }>(`/api/v1/users/${userId}/password-reset`)).data,
    onSuccess: (data) => setPasswordResetMessage(data.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  function openEdit(user: UserRow): void {
    setPasswordResetMessage(undefined);
    setForm({ id: user.id, fullName: user.fullName, email: user.email, password: '', isMaster: user.isMaster, isActive: user.isActive, roleIds: user.roleIds, companies: user.companies });
  }

  function toggleRole(roleId: string, checked: boolean): void {
    setForm((current) => current ? { ...current, roleIds: checked ? [...new Set([...current.roleIds, roleId])] : current.roleIds.filter((id) => id !== roleId) } : current);
  }

  function toggleCompany(company: CompanyOption, checked: boolean): void {
    setForm((current) => {
      if (!current) return current;
      if (!checked) return { ...current, companies: current.companies.filter((item) => item.companyId !== company.id).map((item, index) => ({ ...item, isDefault: index === 0 })) };
      const next = [...current.companies, { companyId: company.id, companyName: companyLabel(company), isDefault: current.companies.length === 0, accessScope: 'OPERATIONAL' as const }];
      return { ...current, companies: next };
    });
  }

  function updateCompany(companyId: string, data: Partial<UserCompany>): void {
    setForm((current) => {
      if (!current) return current;
      return { ...current, companies: current.companies.map((item) => item.companyId === companyId ? { ...item, ...data } : data.isDefault ? { ...item, isDefault: false } : item) };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (form) await save.mutateAsync(form);
  }

  const total = users.data?.total ?? 0;
  const formError = errorMessage(save.error);
  const passwordResetError = errorMessage(requestPasswordReset.error);
  const isSelfForm = Boolean(form?.id && form.id === currentUserId);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Configurações' }, { label: 'Usuários' }]} />
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Usuários</h1>
          <p className="mt-2 text-slate-600">Gerencie acesso ao FinControl por usuário, perfil e empresas permitidas.</p>
        </div>
        <Button onClick={() => { setPasswordResetMessage(undefined); setForm(emptyForm); }}>+ Novo usuário</Button>
      </header>

      <Card>
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input aria-label="Pesquisar usuários" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <select aria-label="Filtrar situação dos usuários" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
            <option value="all">Todos</option>
          </select>
          <span className="self-center text-sm font-semibold text-slate-500">{total} usuário{total === 1 ? '' : 's'}</span>
        </div>
        {users.isLoading ? <p className="py-12 text-center text-slate-500">Carregando...</p> : users.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar usuários.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Perfil</th><th className="px-3 py-3">Empresas</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3 text-right">Ações</th></tr></thead>
              <tbody>
                {users.data?.data.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3"><span className="block font-bold text-slate-950">{user.fullName}</span><span className="text-xs text-slate-500">{user.email}</span></td>
                    <td className="px-3 py-3">{roleLabel(user)}</td>
                    <td className="px-3 py-3">{companiesLabel(user)}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <button className="font-semibold text-blue-700 hover:underline" onClick={() => openEdit(user)}>Editar</button>
                      {user.id === currentUserId ? <span className="ml-4 text-xs font-bold text-slate-400">Você</span> : user.isActive ? <button className="ml-4 font-semibold text-red-700 hover:underline" onClick={() => { if (window.confirm('Inativar usuário?')) deactivate.mutate(user); }}>Inativar</button> : <button className="ml-4 font-semibold text-emerald-700 hover:underline" onClick={() => reactivate.mutate(user)}>Reativar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.data?.data.length === 0 && <p className="py-12 text-center text-slate-500">Nenhum usuário encontrado.</p>}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
          <span className="grid min-w-10 place-items-center text-sm font-bold">{page}</span>
          <Button variant="secondary" disabled={!users.data || page * 20 >= users.data.total} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
        </div>
      </Card>

      {form ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={form.id ? 'Editar usuário' : 'Novo usuário'}>
          <form className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onSubmit={(event) => void submit(event)}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><h2 className="text-2xl font-black text-slate-950">{form.id ? 'Editar usuário' : 'Novo usuário'}</h2><p className="mt-1 text-sm text-slate-500">Senha, perfis e empresas ficam juntos para evitar acesso incompleto.</p></div>
              <button type="button" className="text-2xl text-slate-400" onClick={() => setForm(null)} aria-label="Fechar">×</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Nome<input aria-label="Nome" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3" /></label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">E-mail<input aria-label="E-mail" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3" /></label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{form.id ? 'Nova senha administrativa (opcional)' : 'Senha inicial'}<input aria-label="Senha" required={!form.id} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3" /></label>
              <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.isActive} disabled={isSelfForm} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="size-4 accent-blue-700 disabled:accent-slate-300" />Usuário ativo</label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.isMaster} disabled={isSelfForm} onChange={(event) => setForm({ ...form, isMaster: event.target.checked })} className="size-4 accent-blue-700 disabled:accent-slate-300" />Operador Master</label>
              </div>
            </div>
            {isSelfForm ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Por segurança, você não pode alterar sua própria situação, perfil Master, perfis de acesso ou empresas permitidas nesta tela.</p> : null}
            {form.id ? (
              <section className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black text-slate-950">Recuperação por e-mail</h3>
                    <p className="mt-1 text-sm text-teal-900">Gera um link temporário e registra o envio na caixa de saída do sistema.</p>
                  </div>
                  <Button type="button" onClick={() => requestPasswordReset.mutate(form.id!)} disabled={requestPasswordReset.isPending}>{requestPasswordReset.isPending ? 'Enviando...' : 'Enviar recuperação'}</Button>
                </div>
                {passwordResetMessage ? <p role="status" className="mt-3 text-sm font-semibold text-teal-800">{passwordResetMessage}</p> : null}
                {passwordResetError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{passwordResetError}</p> : null}
              </section>
            ) : null}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-950">Perfis de acesso</h3>
                <div className="mt-3 grid gap-2">
                  {roles.data?.map((role) => <label key={role.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={form.roleIds.includes(role.id)} disabled={isSelfForm} onChange={(event) => toggleRole(role.id, event.target.checked)} className="size-4 accent-blue-700 disabled:accent-slate-300" />{role.name}</label>)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-black text-slate-950">Empresas permitidas</h3>
                <div className="mt-3 grid gap-2">
                  {companies.data?.map((company) => {
                    const selected = form.companies.find((item) => item.companyId === company.id);
                    return <div key={company.id} className="rounded-xl bg-slate-50 px-3 py-2"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(selected)} disabled={isSelfForm} onChange={(event) => toggleCompany(company, event.target.checked)} className="size-4 accent-blue-700 disabled:accent-slate-300" />{companyLabel(company)}</label>{selected ? <div className="mt-2 grid gap-2 pl-7 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="radio" name="default-company" checked={selected.isDefault} disabled={isSelfForm} onChange={() => updateCompany(company.id, { isDefault: true })} />Padrão</label><select aria-label={`Escopo ${companyLabel(company)}`} value={selected.accessScope} disabled={isSelfForm} onChange={(event) => updateCompany(company.id, { accessScope: event.target.value as UserCompany['accessScope'] })} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs disabled:bg-slate-100"><option value="OPERATIONAL">Operacional</option><option value="VIEW_ONLY">Somente leitura</option></select></div> : null}</div>;
                  })}
                </div>
              </div>
            </section>
            {formError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{formError}</p>}
            <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar usuário'}</Button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
