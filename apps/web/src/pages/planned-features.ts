export type PlannedFeature = {
  path: string;
  domain: string;
  title: string;
  description: string;
  suggestedNextSteps: string[];
};

export const plannedFeatures: PlannedFeature[] = [
  {
    path: 'approvals',
    domain: 'Financeiro',
    title: 'Aprovações',
    description: 'Rotina para revisar, aprovar ou reprovar títulos antes da programação de pagamento.',
    suggestedNextSteps: [
      'Definir quais valores ou categorias exigem aprovação.',
      'Confirmar perfis aprovadores e regras de alçada.',
      'Criar modelo de histórico de decisão e auditoria.',
    ],
  },
  {
    path: 'recurrences',
    domain: 'Financeiro',
    title: 'Recorrências',
    description: 'Cadastro e geração automática de contas recorrentes, como aluguel, internet e serviços mensais.',
    suggestedNextSteps: [
      'Definir periodicidades aceitas e regra de geração.',
      'Confirmar se recorrência cria títulos futuros automaticamente ou sob aprovação.',
      'Mapear campos herdados do título modelo.',
    ],
  },
  {
    path: 'bank-reconciliation',
    domain: 'Tesouraria',
    title: 'Conciliação Bancária',
    description: 'Conferência entre pagamentos registrados no sistema e movimentações bancárias.',
    suggestedNextSteps: [
      'Definir formato inicial de importação do extrato.',
      'Mapear critérios de sugestão de conciliação.',
      'Separar baixa financeira de conferência bancária.',
    ],
  },
  {
    path: 'reports',
    domain: 'Relatórios',
    title: 'Relatórios',
    description: 'Central de relatórios operacionais e gerenciais do contas a pagar.',
    suggestedNextSteps: [
      'Listar relatórios essenciais para a primeira entrega.',
      'Definir filtros padrão, exportação e permissões.',
      'Priorizar relatórios por uso operacional diário.',
    ],
  },
  {
    path: 'analytics-dashboards',
    domain: 'Relatórios',
    title: 'Dashboards',
    description: 'Painéis analíticos com indicadores financeiros, evolução e comparativos.',
    suggestedNextSteps: [
      'Separar dashboard operacional de dashboard gerencial.',
      'Definir indicadores por período, fornecedor e categoria.',
      'Criar layout visual aprovado antes da implementação completa.',
    ],
  },
  {
    path: 'cash-flow',
    domain: 'Relatórios',
    title: 'Fluxo de Caixa',
    description: 'Visão consolidada de entradas, saídas previstas e saldo por período.',
    suggestedNextSteps: [
      'Confirmar se a primeira versão considera apenas contas a pagar.',
      'Definir períodos, agrupamentos e saldo inicial.',
      'Planejar integração futura com contas a receber.',
    ],
  },
  {
    path: 'indicators',
    domain: 'Relatórios',
    title: 'Indicadores',
    description: 'KPIs financeiros para acompanhamento de vencimentos, atrasos, pagamentos e fornecedores.',
    suggestedNextSteps: [
      'Definir indicadores obrigatórios da primeira versão.',
      'Confirmar metas, alertas e comparações mensais.',
      'Validar origem dos dados e periodicidade de atualização.',
    ],
  },
  {
    path: 'users',
    domain: 'Configurações',
    title: 'Usuários',
    description: 'Gestão de usuários que acessam o FinControl.',
    suggestedNextSteps: [
      'Definir campos do cadastro de usuário.',
      'Confirmar ativação, bloqueio e redefinição de senha.',
      'Conectar usuários aos perfis de acesso.',
    ],
  },
  {
    path: 'access-profiles',
    domain: 'Configurações',
    title: 'Perfis de Acesso',
    description: 'Configuração de perfis e permissões funcionais por módulo.',
    suggestedNextSteps: [
      'Revisar permissões existentes no backend.',
      'Definir perfis padrão além do operador master.',
      'Criar matriz visual de permissões por tela e ação.',
    ],
  },
  {
    path: 'parameters',
    domain: 'Configurações',
    title: 'Parâmetros',
    description: 'Configurações gerais do sistema, incluindo futuras regras de numeração automática.',
    suggestedNextSteps: [
      'Listar parâmetros globais necessários para a operação.',
      'Definir numeração automática para códigos internos.',
      'Separar parâmetros técnicos de parâmetros funcionais.',
    ],
  },
];
