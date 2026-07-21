export interface SystemConfig {
  id: string;
  company_id: string;
  configuracoes_relatorios: Record<string, any>;
  preferencias: Record<string, any>;
}
