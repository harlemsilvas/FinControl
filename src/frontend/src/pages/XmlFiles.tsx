import React, { useState, useEffect } from "react";
import axios from "axios";

interface XmlFile {
  id: string;
  company_id: string;
  arquivo: string;
  data_importacao: Date;
  status: "pendente" | "processado" | "erro";
}

interface Company {
  id: string;
  nome: string;
}

const XmlFiles: React.FC = () => {
  const [xmlFiles, setXmlFiles] = useState<XmlFile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchXmlFiles();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get("/api/companies");
      setCompanies(response.data);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  const fetchXmlFiles = async () => {
    setLoading(true);
    try {
      let response;
      if (selectedCompany) {
        response = await axios.get(
          `/api/companies/${selectedCompany}/xml-files`,
        );
      } else {
        response = await axios.get("/api/xml-files");
      }
      setXmlFiles(response.data);
    } catch (error) {
      console.error("Erro ao buscar arquivos XML:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCompany(e.target.value);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchXmlFiles();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processado":
        return "bg-green-200 text-green-800";
      case "pendente":
        return "bg-yellow-200 text-yellow-800";
      case "erro":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestão de Arquivos XML</h1>

      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 p-4 border rounded flex items-end"
      >
        <div className="mr-4">
          <label className="block mb-2">Filtrar por Empresa</label>
          <select
            value={selectedCompany}
            onChange={handleFilterChange}
            className="p-2 border rounded"
          >
            <option value="">Todas as empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.nome}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Filtrar
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Arquivo</th>
                <th className="py-2 px-4 border-b">Empresa</th>
                <th className="py-2 px-4 border-b">Data Importação</th>
                <th className="py-2 px-4 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {xmlFiles.map((file) => (
                <tr key={file.id}>
                  <td className="py-2 px-4 border-b">{file.arquivo}</td>
                  <td className="py-2 px-4 border-b">
                    {companies.find((c) => c.id === file.company_id)?.nome}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {new Date(file.data_importacao).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(file.status)}`}
                    >
                      {file.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {xmlFiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum arquivo XML encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XmlFiles;
