import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactElement } from 'react';
import { useForm, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { ApiError, httpClient } from '../api/http-client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Breadcrumb } from '../components/ui/breadcrumb';
import type { FieldConfig, ResourceColumnConfig, ResourceConfig } from './resources';

type Entity = Record<string, unknown>;
type FormValues = Record<string, string | number | boolean | null | undefined>;
type ActiveFilter = 'active' | 'inactive' | 'all';
type SupplierType = 'INDIVIDUAL' | 'COMPANY' | 'FOREIGN';

interface ListResponse {
  data: Entity[];
  page: number;
  pageSize: number;
  total: number;
}

function toActiveParam(filter: ActiveFilter): boolean | undefined {
  if (filter === 'active') return true;
  if (filter === 'inactive') return false;
  return undefined;
}

async function list(config: ResourceConfig, page: number, search: string, activeFilter: ActiveFilter): Promise<ListResponse> {
  const response = await httpClient.get<ListResponse>(`/api/v1${config.path}`, {
    params: {
      page,
      pageSize: 20,
      search: search || undefined,
      active: toActiveParam(activeFilter),
    },
  });
  return response.data;
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

function formatCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatCnpj(value: string): string {
  const digits = digitsOnly(value).slice(0, 14);
  return digits.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? '(' + digits : '';
  if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
  if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
}

function formatPostalCode(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

function supplierTypeLabel(value: unknown): string {
  if (value === 'INDIVIDUAL') return 'Pessoa física';
  if (value === 'COMPANY') return 'Pessoa jurídica';
  if (value === 'FOREIGN') return 'Estrangeiro';
  return display(value);
}

function companyTypeLabel(value: unknown): string {
  if (value === 'MAIN') return 'Matriz';
  if (value === 'BRANCH') return 'Filial';
  return display(value);
}

function display(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Ativo' : 'Inativo';
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '—';
}

function displayColumn(column: ResourceColumnConfig, entity: Entity): string {
  const value = entity[column.key];
  if (column.format === 'supplierDocument') {
    const supplierType = entity.supplierType;
    if (typeof value !== 'string' || value === '') return '—';
    if (supplierType === 'INDIVIDUAL') return formatCpf(value);
    if (supplierType === 'COMPANY') return formatCnpj(value);
    return value;
  }
  if (column.format === 'companyDocument') return typeof value === 'string' && value !== '' ? formatCnpj(value) : '—';
  if (column.format === 'phone') return typeof value === 'string' && value !== '' ? formatPhone(value) : '—';
  if (column.format === 'supplierType') return supplierTypeLabel(value);
  if (column.format === 'companyType') return companyTypeLabel(value);
  if (column.format === 'activeStatus') return typeof value === 'boolean' ? (value ? 'Ativo' : 'Inativo') : '—';
  return display(value);
}

function entityId(entity: Entity): string {
  const value = entity.id;
  if (typeof value !== 'string') throw new Error('Registro sem identificador válido');
  return value;
}

function isActiveEntity(entity: Entity): boolean {
  return entity.isActive !== false;
}

function formatFieldValue(field: FieldConfig, value: unknown, supplierType: SupplierType): FormValues[string] {
  if (field.mask === 'supplierDocument' && typeof value === 'string') {
    if (supplierType === 'INDIVIDUAL') return formatCpf(value);
    if (supplierType === 'COMPANY') return formatCnpj(value);
    return value;
  }
  if (field.mask === 'phone' && typeof value === 'string') return formatPhone(value);
  if (field.mask === 'postalCode' && typeof value === 'string') return formatPostalCode(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return emptyFieldValue(field);
}

function emptyFieldValue(field: FieldConfig): FormValues[string] {
  if (field.type === 'checkbox') return field.name === 'isActive';
  return '';
}

function textValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function inputEventValue(event: unknown): string {
  if (typeof event !== 'object' || event === null || !('target' in event)) return '';
  const target = (event as { target?: unknown }).target;
  if (typeof target !== 'object' || target === null || !('value' in target)) return '';
  const raw = (target as { value?: unknown }).value;
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
}

function validationMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : undefined;
}

function validateField(field: FieldConfig, value: unknown, supplierType: SupplierType): true | string {
  if (value === undefined || value === null || value === '') return field.required ? 'Campo obrigatório.' : true;
  if (field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue(value)) ? true : 'Informe um e-mail válido.';
  if (field.mask === 'phone') {
    const digits = digitsOnly(textValue(value));
    return digits.length === 10 || digits.length === 11 ? true : 'Informe DDD e um telefone válido.';
  }
  if (field.mask === 'postalCode') return digitsOnly(textValue(value)).length === 8 ? true : 'CEP deve conter 8 dígitos.';
  if (field.mask === 'supplierDocument') {
    if (supplierType === 'INDIVIDUAL') return digitsOnly(textValue(value)).length === 11 ? true : 'CPF deve conter 11 dígitos.';
    if (supplierType === 'COMPANY') return digitsOnly(textValue(value)).length === 14 ? true : 'CNPJ deve conter 14 dígitos.';
  }
  return true;
}

function FormField({ field, register, setValue, control, errors }: { field: FieldConfig; register: UseFormRegister<FormValues>; setValue: UseFormSetValue<FormValues>; control: Control<FormValues>; errors: FieldErrors<FormValues> }): ReactElement {
  const lookup = useQuery({
    queryKey: ['lookup', field.lookup?.path],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse>(`/api/v1${field.lookup!.path}`, { params: { pageSize: 100, active: true } });
      return response.data.data;
    },
    enabled: Boolean(field.lookup),
    staleTime: 60000,
  });
  const supplierType = (useWatch({ control, name: 'supplierType' }) as SupplierType | undefined) ?? 'COMPANY';
  const errorMessage = validationMessage(errors[field.name]);

  if (field.type === 'checkbox') {
    return <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium"><input type="checkbox" className="size-4 accent-teal-700" {...register(field.name)} />{field.label}</label>;
  }

  const options = field.options ?? lookup.data?.map((item) => ({ value: display(item[field.lookup!.value]), label: display(item[field.lookup!.label]) })) ?? [];
  if (field.type === 'select') {
    return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{field.label}<select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3" {...register(field.name, { required: field.required ? 'Campo obrigatório.' : false, setValueAs: (value: unknown) => value === '' ? undefined : value })}><option value="">Selecione</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{field.helperText && <span className="text-xs font-normal text-slate-500">{field.helperText}</span>}{errorMessage && <span className="text-xs text-red-700">{errorMessage}</span>}</label>;
  }

  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{field.label}<input type={field.type ?? 'text'} inputMode={field.inputMode} maxLength={field.maxLength} placeholder={field.placeholder} className="min-h-10 rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register(field.name, {
    required: field.required ? 'Campo obrigatório.' : false,
    validate: (value) => validateField(field, value, supplierType),
    onChange: (event) => {
      const current = inputEventValue(event);
      if (field.mask === 'supplierDocument') {
        const formatted = supplierType === 'INDIVIDUAL' ? formatCpf(current) : supplierType === 'COMPANY' ? formatCnpj(current) : current;
        setValue(field.name, formatted, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (field.mask === 'phone') setValue(field.name, formatPhone(current), { shouldDirty: true, shouldValidate: true });
      if (field.mask === 'postalCode') setValue(field.name, formatPostalCode(current), { shouldDirty: true, shouldValidate: true });
    },
    setValueAs: (value: unknown) => field.type === 'number' ? (value === '' ? undefined : Number(value)) : value === '' ? undefined : value,
  })} />{field.helperText && <span className="text-xs font-normal text-slate-500">{field.helperText}</span>}{errorMessage && <span className="text-xs text-red-700">{errorMessage}</span>}</label>;
}

export function MasterDataPage({ config }: { config: ResourceConfig }): ReactElement {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [editing, setEditing] = useState<Entity | null | undefined>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['master-data', config.path, page, search, activeFilter], queryFn: () => list(config, page, search, activeFilter) });
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    setPage(1);
    setSearch('');
    setActiveFilter('active');
    setEditing(undefined);
    reset({});
  }, [config.path, reset]);

  useEffect(() => {
    if (editing !== undefined) {
      const supplierType = (editing?.supplierType as SupplierType | undefined) ?? 'COMPANY';
      const values: FormValues = Object.fromEntries(config.fields.map((field) => [
        field.name,
        editing === null ? emptyFieldValue(field) : formatFieldValue(field, editing?.[field.name], supplierType),
      ]));
      reset(values);
    }
  }, [editing, config, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => editing?.id ? httpClient.patch(`/api/v1${config.path}/${entityId(editing)}`, values) : httpClient.post(`/api/v1${config.path}`, values),
    onSuccess: async () => {
      setEditing(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['master-data', config.path] }),
        queryClient.invalidateQueries({ queryKey: ['lookup'] }),
      ]);
    },
  });

  const remove = useMutation({
    mutationFn: async (entity: Entity) => httpClient.delete(`/api/v1${config.path}/${entityId(entity)}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['master-data', config.path] }),
        queryClient.invalidateQueries({ queryKey: ['lookup'] }),
      ]);
    },
  });

  const reactivate = useMutation({
    mutationFn: async (entity: Entity) => httpClient.post(`/api/v1${config.path}/${entityId(entity)}/reactivate`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['master-data', config.path] }),
        queryClient.invalidateQueries({ queryKey: ['lookup'] }),
      ]);
    },
  });

  const submit = handleSubmit(async (values) => save.mutateAsync(values));
  const error = save.error instanceof ApiError ? save.error.message : save.error ? 'Não foi possível salvar o registro.' : undefined;

  return <div className="grid gap-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Breadcrumb items={[{ label: 'Cadastros' }, { label: config.title }]} /><h1 className="mt-3 text-3xl font-bold">{config.title}</h1><p className="mt-2 text-slate-600">{config.description}</p></div><Button onClick={() => setEditing(null)}>Novo {config.singular.toLowerCase()}</Button></header><Card><div className="mb-5 flex flex-col gap-3 sm:flex-row"><input aria-label={`Pesquisar em ${config.title}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pesquisar…" className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3" /><select aria-label={`Filtrar situação em ${config.title}`} value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as ActiveFilter); setPage(1); }} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"><option value="active">Somente ativos</option><option value="inactive">Somente inativos</option><option value="all">Todos</option></select><span className="self-center text-sm text-slate-500">{query.data?.total ?? 0} registros</span></div>{query.isLoading ? <p className="py-10 text-center text-slate-500">Carregando…</p> : query.isError ? <p role="alert" className="py-10 text-center text-red-700">Não foi possível carregar os registros.</p> : <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500">{config.columns.map((column) => <th key={column.key} className="px-3 py-3 font-semibold">{column.label}</th>)}<th className="px-3 py-3 text-right">Ações</th></tr></thead><tbody>{query.data?.data.map((entity) => <tr key={String(entity.id)} className="border-b border-slate-100 last:border-0">{config.columns.map((column) => <td key={column.key} className="px-3 py-3">{displayColumn(column, entity)}</td>)}<td className="whitespace-nowrap px-3 py-3 text-right">{isActiveEntity(entity) ? <><button className="font-semibold text-teal-700 hover:underline" onClick={() => setEditing(entity)}>Editar</button><button className="ml-4 font-semibold text-red-700 hover:underline" onClick={() => { if (window.confirm(`Inativar ${config.singular.toLowerCase()}?`)) remove.mutate(entity); }}>Inativar</button></> : <button className="font-semibold text-emerald-700 hover:underline" onClick={() => { if (window.confirm(`Reativar ${config.singular.toLowerCase()}?`)) reactivate.mutate(entity); }}>Reativar</button>}</td></tr>)}</tbody></table>{query.data?.data.length === 0 && <p className="py-10 text-center text-slate-500">Nenhum registro encontrado.</p>}</div>}<div className="mt-5 flex justify-end gap-2"><Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="grid min-w-10 place-items-center text-sm">{page}</span><Button variant="secondary" disabled={!query.data || page * 20 >= query.data.total} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div></Card>{editing !== undefined && <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`${editing ? 'Editar' : 'Novo'} ${config.singular}`}><form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onSubmit={(event) => void submit(event)}><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? 'Editar' : 'Novo'} {config.singular.toLowerCase()}</h2><button type="button" className="text-2xl text-slate-400" onClick={() => setEditing(undefined)} aria-label="Fechar">×</button></div><div className="grid gap-4 sm:grid-cols-2">{config.fields.map((field) => <FormField key={field.name} field={field} register={register} setValue={setValue} control={control} errors={errors} />)}</div>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setEditing(undefined)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar'}</Button></div></form></div>}</div>;
}
