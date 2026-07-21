export interface XmlFile {
  id: string;
  company_id: string;
  arquivo: string;
  data_importacao: Date;
  status: "pendente" | "processado" | "erro";
}
