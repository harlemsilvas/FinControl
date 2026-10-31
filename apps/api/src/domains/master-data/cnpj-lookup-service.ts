import { ApplicationError } from '../../common/errors/application-error.js';

export interface CnpjLookupResult {
  source: string;
  documentNumber: string;
  legalName: string;
  tradeName: string | null;
  postalCode: string | null;
  street: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  cityName: string | null;
  stateCode: string | null;
  phone: string | null;
  email: string | null;
  registrationStatus: string | null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export class CnpjLookupService {
  constructor(private readonly baseUrl: string) {}

  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const documentNumber = cnpj.replace(/\D+/g, '');
    if (!/^\d{14}$/.test(documentNumber)) {
      throw new ApplicationError({ code: 'INVALID_CNPJ', message: 'Informe um CNPJ com 14 dígitos.', statusCode: 400 });
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/${documentNumber}`, {
        headers: { accept: 'application/json', 'user-agent': 'FinControl/0.1' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ApplicationError({ code: 'CNPJ_LOOKUP_UNAVAILABLE', message: 'A consulta pública de CNPJ está indisponível no momento.', statusCode: 503 });
    }
    if (response.status === 404) {
      throw new ApplicationError({ code: 'CNPJ_NOT_FOUND', message: 'CNPJ não encontrado na base pública consultada.', statusCode: 404 });
    }
    if (!response.ok) {
      throw new ApplicationError({ code: 'CNPJ_LOOKUP_UNAVAILABLE', message: 'Não foi possível consultar o CNPJ no momento.', statusCode: 503 });
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      source: 'BrasilAPI / dados públicos do CNPJ',
      documentNumber,
      legalName: text(data.razao_social) ?? '',
      tradeName: text(data.nome_fantasia),
      postalCode: text(data.cep)?.replace(/\D+/g, '') ?? null,
      street: text(data.logradouro),
      streetNumber: text(data.numero),
      addressComplement: text(data.complemento),
      neighborhood: text(data.bairro),
      cityName: text(data.municipio),
      stateCode: text(data.uf)?.toUpperCase() ?? null,
      phone: text(data.ddd_telefone_1)?.replace(/\D+/g, '') ?? null,
      email: text(data.email)?.toLowerCase() ?? null,
      registrationStatus: text(data.descricao_situacao_cadastral),
    };
  }
}
