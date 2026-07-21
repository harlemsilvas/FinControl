import React, { useState, useEffect } from "react";
import axios from "axios";

interface Company {
  id: string;
  cnpj: string;
  nome: string;
  tipo: "matriz" | "filial";
  company_id_parent?: string;
}

const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Omit<Company, "id">>({
    cnpj: "",
    nome: "",
    tipo: "matriz",
    company_id_parent: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parents, setParents] = useState<Company[]>([]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get("/api/companies");
      setCompanies(response.data);

      // Filtra apenas as matrizes para serem usadas como empresas pai
      const matrices = response.data.filter(
        (c: Company) => c.tipo === "matriz",
      );
      setParents(matrices);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await axios.put(`/api/companies/${editingId}`, formData);
      } else {
        await axios.post("/api/companies", formData);
      }

      setFormData({
        cnpj: "",
        nome: "",
        tipo: "matriz",
        company_id_parent: "",
      });
      setEditingId(null);
      fetchCompanies();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
    }
  };

  const handleEdit = (company: Company) => {
    setFormData({
      cnpj: company.cnpj,
      nome: company.nome,
      tipo: company.tipo,
      company_id_parent: company.company_id_parent || "",
    });
    setEditingId(company.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta empresa?")) {
      try {
        await axios.delete(`/api/companies/${id}`);
        fetchCompanies();
      } catch (error) {
        console.error("Erro ao excluir empresa:", error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestão de Empresas</h1>

      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded">
        <h2 className="text-xl mb-4">
          {editingId ? "Editar Empresa" : "Adicionar Nova Empresa"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">CNPJ</label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) =>
                setFormData({ ...formData, cnpj: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tipo: e.target.value as "matriz" | "filial",
                })
              }
              className="w-full p-2 border rounded"
            >
              <option value="matriz">Matriz</option>
              <option value="filial">Filial</option>
            </select>
          </div>

          {formData.tipo === "filial" && (
            <div>
              <label className="block mb-2">Empresa Pai (Matriz)</label>
              <select
                value={formData.company_id_parent || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company_id_parent: e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione uma matriz</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 bg-blue-500 text-white p-2 rounded"
        >
          {editingId ? "Atualizar" : "Salvar"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setFormData({
                cnpj: "",
                nome: "",
                tipo: "matriz",
                company_id_parent: "",
              });
            }}
            className="ml-2 bg-gray-500 text-white p-2 rounded"
          >
            Cancelar
          </button>
        )}
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">CNPJ</th>
              <th className="py-2 px-4 border-b">Nome</th>
              <th className="py-2 px-4 border-b">Tipo</th>
              <th className="py-2 px-4 border-b">Empresa Pai</th>
              <th className="py-2 px-4 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="py-2 px-4 border-b">{company.cnpj}</td>
                <td className="py-2 px-4 border-b">{company.nome}</td>
                <td className="py-2 px-4 border-b">{company.tipo}</td>
                <td className="py-2 px-4 border-b">
                  {company.tipo === "filial" && company.company_id_parent
                    ? parents.find((p) => p.id === company.company_id_parent)
                        ?.nome
                    : "-"}
                </td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleEdit(company)}
                    className="bg-yellow-500 text-white p-1 rounded mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    className="bg-red-500 text-white p-1 rounded"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyManagement;
