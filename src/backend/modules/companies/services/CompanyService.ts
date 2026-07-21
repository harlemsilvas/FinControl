import { Company, XmlFile, SystemConfig } from "../entities";

// Simulação de armazenamento em memória (substituir por banco de dados real)
let companies: Company[] = [];
let xmlFiles: XmlFile[] = [];
let systemConfigs: SystemConfig[] = [];

export class CompanyService {
  async getAllCompanies(): Promise<Company[]> {
    return companies;
  }

  async getCompanyById(id: string): Promise<Company> {
    return companies.find((c) => c.id === id);
  }

  async createCompany(data: Omit<Company, "id">): Promise<Company> {
    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
    };
    companies.push(newCompany);
    return newCompany;
  }

  async updateCompany(
    id: string,
    data: Partial<Omit<Company, "id">>,
  ): Promise<Company> {
    const index = companies.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Company not found");

    companies[index] = { ...companies[index], ...data };
    return companies[index];
  }

  async deleteCompany(id: string): Promise<void> {
    companies = companies.filter((c) => c.id !== id);
    // Remover também os arquivos XML associados
    xmlFiles = xmlFiles.filter((x) => x.company_id !== id);
    // Remover também as configurações associadas
    systemConfigs = systemConfigs.filter((s) => s.company_id !== id);
  }

  async getXmlFilesByCompanyId(companyId: string): Promise<XmlFile[]> {
    return xmlFiles.filter((x) => x.company_id === companyId);
  }

  async getAllXmlFiles(): Promise<XmlFile[]> {
    return xmlFiles;
  }

  async getXmlFileById(id: string): Promise<XmlFile> {
    return xmlFiles.find((x) => x.id === id);
  }

  async createXmlFile(
    data: Omit<XmlFile, "id" | "data_importacao">,
  ): Promise<XmlFile> {
    const newXmlFile: XmlFile = {
      id: Math.random().toString(36).substr(2, 9),
      data_importacao: new Date(),
      ...data,
    };
    xmlFiles.push(newXmlFile);
    return newXmlFile;
  }

  async updateXmlFile(
    id: string,
    data: Partial<Omit<XmlFile, "id">>,
  ): Promise<XmlFile> {
    const index = xmlFiles.findIndex((x) => x.id === id);
    if (index === -1) throw new Error("XML File not found");

    xmlFiles[index] = { ...xmlFiles[index], ...data };
    return xmlFiles[index];
  }

  async deleteXmlFile(id: string): Promise<void> {
    xmlFiles = xmlFiles.filter((x) => x.id !== id);
  }

  async getConfigByCompanyId(companyId: string): Promise<SystemConfig> {
    return systemConfigs.find((s) => s.company_id === companyId);
  }

  async createConfig(
    companyId: string,
    data: Omit<SystemConfig, "id" | "company_id">,
  ): Promise<SystemConfig> {
    const existingConfig = systemConfigs.find(
      (s) => s.company_id === companyId,
    );
    if (existingConfig) {
      throw new Error("Configuration already exists for this company");
    }

    const newConfig: SystemConfig = {
      id: Math.random().toString(36).substr(2, 9),
      company_id: companyId,
      ...data,
    };
    systemConfigs.push(newConfig);
    return newConfig;
  }

  async updateConfig(
    id: string,
    data: Partial<Omit<SystemConfig, "id" | "company_id">>,
  ): Promise<SystemConfig> {
    const index = systemConfigs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error("Configuration not found");

    systemConfigs[index] = { ...systemConfigs[index], ...data };
    return systemConfigs[index];
  }
}
