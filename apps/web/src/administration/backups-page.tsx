import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface BackupFile {
  name: string;
  sizeBytes: number;
  createdAt: string;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
}

interface BackupList { data: BackupFile[] }
interface BackupCreateResponse { backup: BackupFile; output: string }

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof ApiError ? error.message : error ? 'Não foi possível executar a rotina de backup.' : undefined;
}

async function downloadBackup(file: BackupFile): Promise<void> {
  const response = await httpClient.get<Blob>(`/api/v1/backups/${encodeURIComponent(file.name)}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function BackupsPage(): ReactElement {
  const queryClient = useQueryClient();
  const backups = useQuery({
    queryKey: ['database-backups'],
    queryFn: async () => (await httpClient.get<BackupList>('/api/v1/backups')).data,
  });
  const createBackup = useMutation({
    mutationFn: async () => (await httpClient.post<BackupCreateResponse>('/api/v1/backups')).data,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['database-backups'] }),
  });
  const exportBackup = useMutation({ mutationFn: downloadBackup });
  const error = errorMessage(createBackup.error) ?? errorMessage(exportBackup.error);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Configurações' }, { label: 'Backups' }]} />
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Backups do banco</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Consulte backups gerados na VPS, crie um novo ponto de segurança e exporte uma cópia local quando necessário.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => void backups.refetch()} disabled={backups.isFetching}>Atualizar</Button>
          <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>{createBackup.isPending ? 'Gerando backup...' : '+ Gerar backup agora'}</Button>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Operação sensível.</strong> Backups podem conter dados financeiros reais. Exporte apenas quando necessário e armazene a cópia local com segurança.
      </section>

      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}

      <Card>
        {backups.isLoading ? <p className="py-12 text-center text-slate-500">Carregando backups...</p> : backups.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar os backups.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3">Arquivo</th>
                  <th className="px-3 py-3">Gerado em</th>
                  <th className="px-3 py-3">Tamanho</th>
                  <th className="px-3 py-3">Checksum</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {backups.data?.data.map((file) => (
                  <tr key={file.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3"><span className="block font-bold text-slate-950">{file.name}</span></td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(file.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatBytes(file.sizeBytes)}</td>
                    <td className="px-3 py-3"><span className="block max-w-64 truncate font-mono text-xs text-slate-500" title={file.checksum ?? 'Checksum não disponível'}>{file.checksum ?? 'Não disponível'}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <Button variant="secondary" onClick={() => exportBackup.mutate(file)} disabled={exportBackup.isPending}>{exportBackup.isPending ? 'Exportando...' : 'Exportar'}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {backups.data?.data.length === 0 ? <p className="py-12 text-center text-slate-500">Nenhum backup encontrado.</p> : null}
          </div>
        )}
      </Card>
    </div>
  );
}
