export interface DfeEntry { chave: string; nsu: string; emitente_cnpj: string | null; data_emissao: string | null }
export interface DfeEntryPage { items: DfeEntry[]; proximo_nsu: string; tem_mais: boolean }

export class DfeApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = 'DfeApiError'; }
}

export interface DfeApiClientOptions { baseUrl: string; apiKey: string; timeoutMs: number; fetchImpl?: typeof fetch }

// Cliente somente leitura da API de integracao do DFe-SEFAZ Enhanced (/api/integracao/v1).
export class DfeApiClient {
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: DfeApiClientOptions) {
    this.base = `${options.baseUrl.replace(/\/+$/, '')}/api/integracao/v1`;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: { 'X-DFE-Integracao-Key': this.options.apiKey, ...init.headers },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    // Nunca inclui corpo/headers na mensagem: pode conter dados fiscais.
    if (!response.ok) throw new DfeApiError(response.status, `DFe API respondeu ${response.status}`);
    return response;
  }

  async listCompanies(): Promise<string[]> {
    const body = await (await this.request('/empresas')).json() as { items: Array<{ cnpj: string }> };
    return body.items.map((item) => item.cnpj);
  }

  async listEntries(cnpj: string, afterNsu: string, limit: number): Promise<DfeEntryPage> {
    const query = new URLSearchParams({ apos_nsu: afterNsu, limite: String(limit) });
    return await (await this.request(`/empresas/${cnpj}/nfe-entrada?${query}`)).json() as DfeEntryPage;
  }

  async downloadXml(cnpj: string, accessKey: string): Promise<string> {
    return (await this.request(`/empresas/${cnpj}/nfe-entrada/${accessKey}/xml`)).text();
  }

  async confirm(cnpj: string, lastNsu: string): Promise<void> {
    await this.request(`/empresas/${cnpj}/confirmacao`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ultimo_nsu: lastNsu }),
    });
  }
}
