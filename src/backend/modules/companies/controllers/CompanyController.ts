import { Request, Response } from "express";
import { CompanyService } from "../services/CompanyService";

export class CompanyController {
  private service = new CompanyService();

  async getAll(req: Request, res: Response) {
    try {
      const companies = await this.service.getAllCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const company = await this.service.getCompanyById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const company = await this.service.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company = await this.service.updateCompany(req.params.id, req.body);
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await this.service.deleteCompany(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getXmlFilesByCompany(req: Request, res: Response) {
    try {
      const xmlFiles = await this.service.getXmlFilesByCompanyId(
        req.params.companyId,
      );
      res.json(xmlFiles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAllXmlFiles(req: Request, res: Response) {
    try {
      const xmlFiles = await this.service.getAllXmlFiles();
      res.json(xmlFiles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getXmlFileById(req: Request, res: Response) {
    try {
      const xmlFile = await this.service.getXmlFileById(req.params.id);
      if (!xmlFile) {
        return res.status(404).json({ error: "XML File not found" });
      }
      res.json(xmlFile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createXmlFile(req: Request, res: Response) {
    try {
      const xmlFile = await this.service.createXmlFile(req.body);
      res.status(201).json(xmlFile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateXmlFile(req: Request, res: Response) {
    try {
      const xmlFile = await this.service.updateXmlFile(req.params.id, req.body);
      res.json(xmlFile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteXmlFile(req: Request, res: Response) {
    try {
      await this.service.deleteXmlFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getConfigByCompany(req: Request, res: Response) {
    try {
      const config = await this.service.getConfigByCompanyId(
        req.params.companyId,
      );
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createConfig(req: Request, res: Response) {
    try {
      const config = await this.service.createConfig(
        req.params.companyId,
        req.body,
      );
      res.status(201).json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const config = await this.service.updateConfig(req.params.id, req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
