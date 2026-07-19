import { useMemo, useState, type ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { ApiError, httpClient } from '../api/http-client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type ActiveFilter = 'active' | 'inactive' | 'all';
type SupplierType = 'INDIVIDUAL' | 'COMPANY' | 'FOREIGN';
type SupplierStatusCode = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

interface ListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

interface Supplier {
  id: string;
  isActive: boolean;
  supplierType: SupplierType;
  legalName: string;
  tradeName: string | null;
  documentNumber: string | null;
  countryCode: string | null;
  representativeName: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  secondaryPhone: string | null;
  notes: string | null;
  isForeign: boolean;
  isApproved: boolean;
  isBlocked: boolean;
  statusId: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  supplierCategoryId: string | null;
  postalCode: string | null;
  street: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  cityId: string | null;
  stateId: string | null;
  financialEmail: string | null;
  markerIds: string[];
}

interface LookupItem {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  stateId?: string;
}

interface SupplierFormValues {
  supplierType: SupplierType;
  legalName: string;
  tradeName: string;
  statusId: string;
  documentNumber: string;
  stateRegistration: string;
  municipalRegistration: string;
  supplierCategoryId: string;
  postalCode: string;
  street: string;
  streetNumber: string;
  addressComplement: string;
  neighborhood: string;
  cityId: string;
  stateId: string;
  countryCode: string;
  phone: string;
  mobilePhone: string;
  secondaryPhone: string;
  email: string;
  financialEmail: string;
  representativeName: string;
  markerIds: string[];
}

const tabs = ['Dados Gerais', 'Dados Financeiros', 'Documentos', 'Informações Complementares', 'Pedidos'] as const;

function toActiveParam(filter: ActiveFilter): boolean | undefined {
  if (filter === 'active') return true;
  if (filter === 'inactive') return false;
  return undefined;
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

function formatDocument(value: string, type: SupplierType): string {
  if (type === 'INDIVIDUAL') return formatCpf(value);
  if (type === 'COMPANY') return formatCnpj(value);
  return value;
}

function formatPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPostalCode(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function statusBadgeClass(code?: string): string {
  if (code === 'BLOCKED') return 'bg-red-100 text-red-700';
  if (code === 'INACTIVE') return 'bg-slate-200 text-slate-700';
  return 'bg-emerald-100 text-emerald-700';
}

function normalizeOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function inputValueFromUnknown(event: unknown): string {
  if (typeof event !== 'object' || event === null || !('target' in event)) return '';
  const target = (event as { target?: unknown }).target;
  if (typeof target !== 'object' || target === null || !('value' in target)) return '';
  const value = (target as { value?: unknown }).value;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function defaultFormValues(): SupplierFormValues {
  return {
    supplierType: 'COMPANY',
    legalName: '',
    tradeName: '',
    statusId: '',
    documentNumber: '',
    stateRegistration: '',
    municipalRegistration: '',
    supplierCategoryId: '',
    postalCode: '',
    street: '',
    streetNumber: '',
    addressComplement: '',
    neighborhood: '',
    cityId: '',
    stateId: '',
    countryCode: 'BR',
    phone: '',
    mobilePhone: '',
    secondaryPhone: '',
    email: '',
    financialEmail: '',
    representativeName: '',
    markerIds: [],
  };
}

function SupplierField({
  label,
  required,
  error,
  children,
  helperText,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  children: ReactElement;
}): ReactElement {
  return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}><span>{label}{required ? ' *' : ''}</span>{children}{helperText ? <span className="text-xs font-normal text-slate-500">{helperText}</span> : null}{error ? <span className="text-xs text-red-700">{error}</span> : null}</label>;
}

export function SuppliersPage(): ReactElement {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', page, search, activeFilter],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<Supplier>>('/api/v1/suppliers', {
        params: { page, pageSize: 20, search: search || undefined, active: toActiveParam(activeFilter) },
      });
      return response.data;
    },
  });

  const statusesQuery = useQuery({
    queryKey: ['supplier-statuses'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/supplier-statuses', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/supplier-categories', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });
  const markersQuery = useQuery({
    queryKey: ['markers'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/markers', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });
  const statesQuery = useQuery({
    queryKey: ['states'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/states', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });
  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/cities', { params: { pageSize: 500, active: true } })).data.data,
    staleTime: 60000,
  });

  const statusById = useMemo(() => new Map((statusesQuery.data ?? []).map((item) => [item.id, item])), [statusesQuery.data]);
  const categoryById = useMemo(() => new Map((categoriesQuery.data ?? []).map((item) => [item.id, item])), [categoriesQuery.data]);
  const stateById = useMemo(() => new Map((statesQuery.data ?? []).map((item) => [item.id, item])), [statesQuery.data]);
  const cityById = useMemo(() => new Map((citiesQuery.data ?? []).map((item) => [item.id, item])), [citiesQuery.data]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SupplierFormValues>({ defaultValues: defaultFormValues() });
  const supplierType = watch('supplierType');
  const stateId = watch('stateId');
  const markerIds = watch('markerIds');

  const filteredCities = useMemo(() => {
    const cities = citiesQuery.data ?? [];
    if (!stateId) return cities;
    return cities.filter((item) => item.stateId === stateId);
  }, [citiesQuery.data, stateId]);

  const openNewForm = (): void => {
    const defaultStatus = statusesQuery.data?.find((item) => item.code === 'ACTIVE')?.id ?? '';
    reset({ ...defaultFormValues(), statusId: defaultStatus });
    setEditing(null);
    setFormOpen(true);
  };

  const openEditForm = (supplier: Supplier): void => {
    reset({
      supplierType: supplier.supplierType,
      legalName: supplier.legalName ?? '',
      tradeName: supplier.tradeName ?? '',
      statusId: supplier.statusId ?? '',
      documentNumber: formatDocument(supplier.documentNumber ?? '', supplier.supplierType),
      stateRegistration: supplier.stateRegistration ?? '',
      municipalRegistration: supplier.municipalRegistration ?? '',
      supplierCategoryId: supplier.supplierCategoryId ?? '',
      postalCode: formatPostalCode(supplier.postalCode ?? ''),
      street: supplier.street ?? '',
      streetNumber: supplier.streetNumber ?? '',
      addressComplement: supplier.addressComplement ?? '',
      neighborhood: supplier.neighborhood ?? '',
      cityId: supplier.cityId ?? '',
      stateId: supplier.stateId ?? '',
      countryCode: supplier.countryCode ?? 'BR',
      phone: formatPhone(supplier.phone ?? ''),
      mobilePhone: formatPhone(supplier.mobilePhone ?? ''),
      secondaryPhone: formatPhone(supplier.secondaryPhone ?? ''),
      email: supplier.email ?? '',
      financialEmail: supplier.financialEmail ?? '',
      representativeName: supplier.representativeName ?? '',
      markerIds: supplier.markerIds ?? [],
    });
    setEditing(supplier);
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const selectedStatus = statusById.get(values.statusId);
      const statusCode = (selectedStatus?.code ?? 'ACTIVE') as SupplierStatusCode;
      const payload = {
        supplierType: values.supplierType,
        legalName: values.legalName.trim(),
        tradeName: normalizeOptional(values.tradeName),
        statusId: values.statusId,
        documentNumber: normalizeOptional(formatDocument(values.documentNumber, values.supplierType)),
        stateRegistration: normalizeOptional(values.stateRegistration),
        municipalRegistration: normalizeOptional(values.municipalRegistration),
        supplierCategoryId: values.supplierCategoryId || undefined,
        postalCode: normalizeOptional(formatPostalCode(values.postalCode)),
        street: normalizeOptional(values.street),
        streetNumber: normalizeOptional(values.streetNumber),
        addressComplement: normalizeOptional(values.addressComplement),
        neighborhood: normalizeOptional(values.neighborhood),
        cityId: values.cityId || undefined,
        stateId: values.stateId || undefined,
        countryCode: normalizeOptional(values.countryCode)?.toUpperCase(),
        phone: normalizeOptional(formatPhone(values.phone)),
        mobilePhone: normalizeOptional(formatPhone(values.mobilePhone)),
        secondaryPhone: normalizeOptional(formatPhone(values.secondaryPhone)),
        email: normalizeOptional(values.email),
        financialEmail: normalizeOptional(values.financialEmail),
        representativeName: normalizeOptional(values.representativeName),
        markerIds: values.markerIds,
        isActive: statusCode !== 'INACTIVE',
        isBlocked: statusCode === 'BLOCKED',
      };
      if (editing) return httpClient.patch(`/api/v1/suppliers/${editing.id}`, payload);
      return httpClient.post('/api/v1/suppliers', payload);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (supplier: Supplier) => httpClient.delete(`/api/v1/suppliers/${supplier.id}`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (supplier: Supplier) => httpClient.post(`/api/v1/suppliers/${supplier.id}/reactivate`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const onSubmit: SubmitHandler<SupplierFormValues> = async (values) => saveMutation.mutateAsync(values);

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-teal-700">Cadastros</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Cadastro de Fornecedores</h1>
        <p className="mt-2 text-slate-600">Onda 1: dados gerais, endereço, contatos, categoria, status e marcadores.</p>
      </div>
      <Button onClick={openNewForm}>Novo fornecedor</Button>
    </header>

    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pesquisar por nome, documento ou contato..." className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as ActiveFilter); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <span className="text-sm text-slate-500">{suppliersQuery.data?.total ?? 0} registros</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-3 font-semibold">Fornecedor</th>
              <th className="px-3 py-3 font-semibold">Documento</th>
              <th className="px-3 py-3 font-semibold">Categoria</th>
              <th className="px-3 py-3 font-semibold">Cidade/UF</th>
              <th className="px-3 py-3 font-semibold">Contato</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {suppliersQuery.data?.data.map((supplier) => {
              const status = supplier.statusId ? statusById.get(supplier.statusId) : undefined;
              const category = supplier.supplierCategoryId ? categoryById.get(supplier.supplierCategoryId) : undefined;
              const city = supplier.cityId ? cityById.get(supplier.cityId) : undefined;
              const state = supplier.stateId ? stateById.get(supplier.stateId) : undefined;
              return <tr key={supplier.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-4">
                  <div className="font-semibold text-slate-900">{supplier.legalName}</div>
                  <div className="text-xs text-slate-500">{supplier.tradeName || 'Sem nome fantasia'} - {supplier.supplierType === 'INDIVIDUAL' ? 'Pessoa física' : supplier.supplierType === 'COMPANY' ? 'Pessoa jurídica' : 'Estrangeiro'}</div>
                </td>
                <td className="px-3 py-4">{supplier.documentNumber ? formatDocument(supplier.documentNumber, supplier.supplierType) : '?'}</td>
                <td className="px-3 py-4">{category?.name ?? '?'}</td>
                <td className="px-3 py-4">{city?.name ? `${city.name}${state?.code ? `/${state.code}` : ''}` : '?'}</td>
                <td className="px-3 py-4">
                  <div>{supplier.phone ? formatPhone(supplier.phone) : '?'}</div>
                  <div className="text-xs text-slate-500">{supplier.email || supplier.financialEmail || 'Sem e-mail'}</div>
                </td>
                <td className="px-3 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(status?.code)}`}>{status?.name ?? (supplier.isActive ? 'Ativo' : 'Inativo')}</span></td>
                <td className="px-3 py-4 text-right">
                  <button className="font-semibold text-teal-700 hover:underline" onClick={() => openEditForm(supplier)}>Editar</button>
                  {supplier.isActive ? <button className="ml-4 font-semibold text-red-700 hover:underline" onClick={() => { if (window.confirm('Inativar fornecedor?')) deactivateMutation.mutate(supplier); }}>Inativar</button> : <button className="ml-4 font-semibold text-emerald-700 hover:underline" onClick={() => reactivateMutation.mutate(supplier)}>Reativar</button>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {suppliersQuery.isLoading ? <p className="py-10 text-center text-slate-500">Carregando fornecedores...</p> : null}
        {suppliersQuery.isError ? <p className="py-10 text-center text-red-700">Não foi possível carregar os fornecedores.</p> : null}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
        <span className="grid min-w-10 place-items-center text-sm">{page}</span>
        <Button variant="secondary" disabled={!suppliersQuery.data || page * 20 >= suppliersQuery.data.total} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
      </div>
    </Card>

    {formOpen ? <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-950/50 p-4">
      <div className="mx-auto w-full max-w-7xl rounded-[28px] bg-white shadow-2xl">
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{editing ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
              <p className="mt-1 text-sm text-slate-500">Dados gerais, endereço e contatos principais.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button variant="secondary" type="submit">Salvar e novo</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>

          <div className="border-b border-slate-200 px-6 pt-4">
            <div className="flex flex-wrap gap-6 text-sm font-semibold text-slate-500">
              {tabs.map((tab, index) => <button key={tab} type="button" className={`border-b-2 pb-3 ${index === 0 ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>{tab}</button>)}
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6">
            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="mb-5 text-lg font-bold text-slate-900">Dados Gerais</h3>
              <div className="grid gap-4 lg:grid-cols-4">
                <SupplierField label="Nome / Razão Social" required error={errors.legalName?.message} className="lg:col-span-2"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('legalName', { required: 'Campo obrigatório.' })} /></SupplierField>
                <SupplierField label="Nome Fantasia" className="lg:col-span-1"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('tradeName')} /></SupplierField>
                <SupplierField label="Tipo de Pessoa" required error={errors.supplierType?.message}><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('supplierType', { required: 'Campo obrigatório.' })}><option value="COMPANY">Jurídica</option><option value="INDIVIDUAL">Física</option><option value="FOREIGN">Estrangeiro</option></select></SupplierField>

                <SupplierField label={supplierType === 'INDIVIDUAL' ? 'CPF' : supplierType === 'COMPANY' ? 'CNPJ' : 'Documento'} error={errors.documentNumber?.message}><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('documentNumber', {
                  onChange: (event) => setValue('documentNumber', formatDocument(inputValueFromUnknown(event), supplierType)),
                  validate: (value) => {
                    const digits = digitsOnly(value ?? '');
                    if (!value) return true;
                    if (supplierType === 'INDIVIDUAL') return digits.length === 11 || 'CPF deve conter 11 dígitos.';
                    if (supplierType === 'COMPANY') return digits.length === 14 || 'CNPJ deve conter 14 dígitos.';
                    return true;
                  },
                })} /></SupplierField>
                <SupplierField label="Inscrição Estadual"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('stateRegistration')} /></SupplierField>
                <SupplierField label="Inscrição Municipal"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('municipalRegistration')} /></SupplierField>
                <SupplierField label="Categoria"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('supplierCategoryId')}><option value="">Selecione</option>{(categoriesQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SupplierField>
                <SupplierField label="Status" required><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('statusId', { required: 'Campo obrigatório.' })}><option value="">Selecione</option>{(statusesQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SupplierField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="mb-5 text-lg font-bold text-slate-900">Endereço</h3>
              <div className="grid gap-4 lg:grid-cols-5">
                <SupplierField label="CEP" error={errors.postalCode?.message}><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('postalCode', { onChange: (event) => setValue('postalCode', formatPostalCode(inputValueFromUnknown(event))) })} /></SupplierField>
                <SupplierField label="Logradouro" required error={errors.street?.message} className="lg:col-span-2"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('street')} /></SupplierField>
                <SupplierField label="Número"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('streetNumber')} /></SupplierField>
                <SupplierField label="Complemento"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('addressComplement')} /></SupplierField>
                <SupplierField label="Bairro"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('neighborhood')} /></SupplierField>
                <SupplierField label="Cidade"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('cityId')}><option value="">Selecione</option>{filteredCities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SupplierField>
                <SupplierField label="Estado"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('stateId')}><option value="">Selecione</option>{(statesQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></SupplierField>
                <SupplierField label="País"><input className="min-h-11 rounded-xl border border-slate-300 px-3 uppercase outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('countryCode')} /></SupplierField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="mb-5 text-lg font-bold text-slate-900">Contatos</h3>
              <div className="grid gap-4 lg:grid-cols-4">
                <SupplierField label="Telefone Comercial" error={errors.phone?.message}><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('phone', { onChange: (event) => setValue('phone', formatPhone(inputValueFromUnknown(event))) })} /></SupplierField>
                <SupplierField label="Celular / WhatsApp" error={errors.mobilePhone?.message}><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('mobilePhone', { onChange: (event) => setValue('mobilePhone', formatPhone(inputValueFromUnknown(event))) })} /></SupplierField>
                <SupplierField label="Telefone adicional" error={errors.secondaryPhone?.message}><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('secondaryPhone', { onChange: (event) => setValue('secondaryPhone', formatPhone(inputValueFromUnknown(event))) })} /></SupplierField>
                <SupplierField label="Representante"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('representativeName')} /></SupplierField>
                <SupplierField label="E-mail Principal" error={errors.email?.message} className="lg:col-span-2"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('email', { validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Informe um e-mail válido.' })} /></SupplierField>
                <SupplierField label="E-mail Financeiro" error={errors.financialEmail?.message} className="lg:col-span-2"><input className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" {...register('financialEmail', { validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Informe um e-mail válido.' })} /></SupplierField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="mb-5 text-lg font-bold text-slate-900">Marcadores</h3>
              <div className="flex flex-wrap gap-3">
                {(markersQuery.data ?? []).map((marker) => {
                  const checked = markerIds.includes(marker.id);
                  return <label key={marker.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${checked ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-600'}`}>
                    <input type="checkbox" className="hidden" checked={checked} onChange={() => setValue('markerIds', checked ? markerIds.filter((item) => item !== marker.id) : [...markerIds, marker.id], { shouldDirty: true })} />
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: marker.color || '#0f766e' }} />
                    {marker.name}
                  </label>;
                })}
              </div>
            </section>

            {saveMutation.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveMutation.error instanceof ApiError ? saveMutation.error.message : 'Não foi possível salvar o fornecedor.'}</p> : null}
          </div>
        </form>
      </div>
    </div> : null}
  </div>;
}
