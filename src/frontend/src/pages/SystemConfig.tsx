import React, { useState, useEffect } from "react";
import axios from "axios";

interface SystemConfig {
  id: string;
  company_id: string;
  configuracoes_relatorios: Record<string, any>;
  preferencias: Record<string, any>;
}

interface Company {
  id: string;
  nome: string;
}

const SystemConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [configData, setConfigData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get("/api/companies");
      setCompanies(response.data);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  const loadConfigForCompany = async (companyId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/companies/${companyId}/config`);
      if (response.data) {
        setConfigData(response.data);
      } else {
        setConfigData({});
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setConfigData({});
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value;
    setSelectedCompany(companyId);

    if (companyId) {
      loadConfigForCompany(companyId);
    } else {
      setConfigData({});
    }
  };

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfigData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany) {
      alert("Por favor, selecione uma empresa primeiro");
      return;
    }

    try {
      if (configData.id) {
        // Update existing config
        await axios.put(`/api/config/${configData.id}`, {
          configuracoes_relatorios: configData.configuracoes_relatorios || {},
          preferencias: configData.preferencias || {},
        });
      } else {
        // Create new config
        await axios.post(`/api/companies/${selectedCompany}/config`, {
          configuracoes_relatorios: configData.configuracoes_relatorios || {},
          preferencias: configData.preferencias || {},
        });
      }

      alert("Configurações salvas com sucesso!");
      // Reload configs after save
      loadConfigForCompany(selectedCompany);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar configurações");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Configurações do Sistema</h1>

      <div className="mb-6 p-4 border rounded">
        <label className="block mb-2">Selecionar Empresa</label>
        <select
          value={selectedCompany}
          onChange={handleCompanyChange}
          className="p-2 border rounded w-full md:w-1/2"
        >
          <option value="">Selecione uma empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.nome}
            </option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <form onSubmit={handleSubmit} className="p-4 border rounded">
          <h2 className="text-xl mb-4">
            Configurações para:{" "}
            {companies.find((c) => c.id === selectedCompany)?.nome}
          </h2>

          {loading ? (
            <div className="text-center py-8">Carregando configurações...</div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg mb-3">Configurações de Relatórios</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">Formato Padrão</label>
                    <select
                      value={
                        configData.configuracoes_relatorios?.formato_padrao ||
                        ""
                      }
                      onChange={(e) =>
                        handleConfigChange(
                          "configuracoes_relatorios",
                          "formato_padrao",
                          e.target.value,
                        )
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Selecione um formato</option>
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2">Visualização Padrão</label>
                    <select
                      value={
                        configData.configuracoes_relatorios
                          ?.visualizacao_padrao || ""
                      }
                      onChange={(e) =>
                        handleConfigChange(
                          "configuracoes_relatorios",
                          "visualizacao_padrao",
                          e.target.value,
                        )
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Selecione visualização</option>
                      <option value="tabela">Tabela</option>
                      <option value="grafico">Gráfico</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2">Período Padrão (dias)</label>
                    <input
                      type="number"
                      value={
                        configData.configuracoes_relatorios?.periodo_padrao ||
                        ""
                      }
                      onChange={(e) =>
                        handleConfigChange(
                          "configuracoes_relatorios",
                          "periodo_padrao",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg mb-3">Preferências</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!configData.preferencias?.notificacoes_ativas}
                        onChange={(e) =>
                          handleConfigChange(
                            "preferencias",
                            "notificacoes_ativas",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      Ativar Notificações
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!configData.preferencias?.modo_escuro}
                        onChange={(e) =>
                          handleConfigChange(
                            "preferencias",
                            "modo_escuro",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      Modo Escuro
                    </label>
                  </div>

                  <div>
                    <label className="block mb-2">
                      Quantidade Itens/Página
                    </label>
                    <input
                      type="number"
                      value={configData.preferencias?.itens_por_pagina || ""}
                      onChange={(e) =>
                        handleConfigChange(
                          "preferencias",
                          "itens_por_pagina",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-blue-500 text-white p-2 rounded"
              >
                Salvar Configurações
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default SystemConfigPage;
