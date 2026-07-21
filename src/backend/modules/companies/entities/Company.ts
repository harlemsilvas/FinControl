export interface Company {
  id: string;
  cnpj: string;
  nome: string;
  tipo: "matriz" | "filial";
  company_id_parent?: string;
}
