# Documento 01 — Levantamento de Necessidades

**Projeto:** FinControl  
**Módulo inicial:** Contas a Pagar  
**Código do documento:** DOC-01  
**Versão:** 0.2  
**Status:** Em elaboração  
**Data de atualização:** 16/07/2026  
**Responsável:** Projeto FinControl  

---

## 1. Objetivo do Documento

Este documento tem como objetivo identificar, organizar e registrar as necessidades funcionais, operacionais, gerenciais, técnicas e de controle relacionadas ao módulo **Contas a Pagar** do FinControl.

O conteúdo servirá como base oficial para:

- definição das regras de negócio;
- elaboração dos fluxos operacionais;
- criação dos casos de uso;
- desenvolvimento dos wireframes;
- modelagem do banco de dados;
- definição das APIs;
- planejamento dos testes;
- homologação funcional;
- priorização do MVP.

Nenhuma funcionalidade do módulo Contas a Pagar deverá ser implementada antes da validação formal deste levantamento.

---

## 2. Contexto do Módulo

O módulo Contas a Pagar será responsável por controlar todo o ciclo de vida das obrigações financeiras da empresa, desde o registro inicial do compromisso até sua quitação, cancelamento ou estorno.

O módulo deverá permitir visão operacional e gerencial das obrigações, garantindo:

- organização dos compromissos financeiros;
- previsibilidade de vencimentos;
- redução de atrasos;
- rastreabilidade das alterações;
- controle de aprovações;
- segurança na execução dos pagamentos;
- integração com agenda financeira;
- apoio ao fluxo de caixa;
- suporte a auditoria;
- geração de indicadores confiáveis.

---

## 3. Escopo do Levantamento

O levantamento contempla os seguintes grupos funcionais:

1. Empresas e filiais.
2. Fornecedores.
3. Categorias financeiras.
4. Centros de custo.
5. Projetos.
6. Bancos e contas bancárias.
7. Formas de pagamento.
8. Lançamentos de contas a pagar.
9. Parcelamentos.
10. Recorrências.
11. Rateios.
12. Aprovações.
13. Programação de pagamentos.
14. Pagamentos.
15. Baixas.
16. Pagamentos parciais.
17. Juros, multas, descontos e acréscimos.
18. Cancelamentos.
19. Estornos.
20. Anexos e documentos.
21. Agenda financeira.
22. Consultas e filtros.
23. Relatórios.
24. Indicadores.
25. Auditoria.
26. Segurança e permissões.
27. Importações e integrações futuras.

---

## 4. Objetivos de Negócio

O módulo deverá atender aos seguintes objetivos:

- centralizar todas as contas a pagar;
- evitar perda de prazos;
- melhorar o planejamento financeiro;
- reduzir lançamentos duplicados;
- permitir segregação de funções;
- controlar alçadas de aprovação;
- registrar o histórico completo de cada título;
- oferecer visão por empresa, fornecedor, categoria e centro de custo;
- fornecer informações para o fluxo de caixa;
- facilitar auditorias internas e externas;
- padronizar os processos financeiros;
- permitir crescimento para múltiplas empresas;
- preparar a plataforma para integrações bancárias futuras.

---

## 5. Perfis de Usuário

### 5.1 Administrador do Sistema

Responsável por:

- cadastrar usuários;
- definir perfis;
- conceder permissões;
- configurar parâmetros gerais;
- configurar empresas;
- visualizar logs e auditoria;
- administrar integrações.

### 5.2 Gestor Financeiro

Responsável por:

- acompanhar indicadores;
- aprovar títulos;
- revisar pagamentos;
- consultar fluxo financeiro;
- analisar vencimentos;
- acompanhar relatórios;
- autorizar estornos e cancelamentos.

### 5.3 Analista Financeiro

Responsável por:

- cadastrar títulos;
- revisar documentos;
- classificar despesas;
- organizar pagamentos;
- consultar fornecedores;
- gerar relatórios operacionais.

### 5.4 Operador de Contas a Pagar

Responsável por:

- incluir contas;
- alterar dados permitidos;
- anexar documentos;
- programar pagamentos;
- registrar baixas;
- acompanhar pendências.

### 5.5 Aprovador

Responsável por:

- analisar títulos;
- aprovar;
- reprovar;
- devolver para correção;
- registrar justificativas.

### 5.6 Auditor

Responsável por:

- consultar títulos;
- visualizar histórico;
- verificar aprovações;
- consultar alterações;
- acessar relatórios;
- sem permissão para alterar dados.

### 5.7 Usuário de Consulta

Responsável por:

- consultar títulos autorizados;
- visualizar relatórios permitidos;
- sem permissão para inclusão, alteração ou pagamento.

---

## 6. Entidades Principais

O módulo deverá considerar inicialmente as seguintes entidades:

- Empresa
- Filial
- Fornecedor
- Pessoa física
- Pessoa jurídica
- Categoria financeira
- Subcategoria
- Centro de custo
- Projeto
- Banco
- Conta bancária
- Forma de pagamento
- Condição de pagamento
- Título a pagar
- Parcela
- Rateio
- Aprovação
- Programação de pagamento
- Pagamento
- Anexo
- Evento de auditoria
- Usuário
- Perfil
- Permissão

---

## 7. Processo Macro do Contas a Pagar

O processo principal deverá seguir o fluxo abaixo:

1. Identificação da obrigação.
2. Cadastro ou seleção do fornecedor.
3. Inclusão do título.
4. Classificação financeira.
5. Definição de vencimento.
6. Definição de parcelas.
7. Inclusão de rateios.
8. Anexação de documentos.
9. Validação do lançamento.
10. Envio para aprovação, quando aplicável.
11. Aprovação ou devolução.
12. Programação do pagamento.
13. Execução do pagamento.
14. Registro da baixa.
15. Atualização do fluxo de caixa.
16. Registro de auditoria.
17. Disponibilização em relatórios e indicadores.

---

## 8. Necessidades Funcionais

### 8.1 Empresas e Filiais

O sistema deverá:

- permitir múltiplas empresas;
- permitir múltiplas filiais por empresa;
- separar dados por empresa;
- permitir consolidação gerencial;
- definir uma empresa padrão para o usuário;
- restringir acesso conforme permissão;
- permitir parâmetros específicos por empresa;
- permitir calendário financeiro por empresa;
- permitir moeda e configuração regional por empresa.

### 8.2 Fornecedores

O sistema deverá:

- cadastrar pessoa física ou jurídica;
- armazenar CPF ou CNPJ;
- validar documento;
- impedir duplicidade indevida;
- controlar situação ativa ou inativa;
- armazenar nome, razão social e nome fantasia;
- armazenar contatos;
- armazenar endereços;
- armazenar dados bancários;
- armazenar chaves PIX;
- armazenar documentos;
- armazenar observações;
- armazenar categorias vinculadas;
- registrar histórico de alterações;
- permitir consulta por nome, documento e código;
- permitir bloqueio para novos lançamentos;
- permitir marcar fornecedor como homologado;
- permitir classificar fornecedor por tipo.

### 8.3 Categorias Financeiras

O sistema deverá:

- cadastrar categorias;
- cadastrar subcategorias;
- permitir estrutura hierárquica;
- definir natureza da categoria;
- vincular categoria a contas a pagar;
- controlar categoria ativa ou inativa;
- permitir restrição por empresa;
- apoiar relatórios gerenciais;
- apoiar fluxo de caixa;
- permitir categoria padrão por fornecedor.

### 8.4 Centros de Custo

O sistema deverá:

- cadastrar centros de custo;
- permitir estrutura hierárquica;
- vincular centro de custo à empresa;
- controlar situação;
- permitir rateio entre centros;
- permitir bloqueio por período;
- permitir filtros e relatórios.

### 8.5 Projetos

O sistema deverá:

- cadastrar projetos;
- vincular projeto à empresa;
- vincular projeto a centro de custo;
- controlar vigência;
- controlar situação;
- permitir classificação de despesas por projeto;
- gerar relatórios por projeto.

### 8.6 Bancos e Contas Bancárias

O sistema deverá:

- cadastrar bancos;
- cadastrar contas bancárias;
- vincular conta à empresa;
- armazenar agência, conta e tipo;
- armazenar identificação PIX;
- controlar situação ativa ou inativa;
- indicar conta padrão;
- restringir contas por usuário;
- utilizar conta em programação e pagamento;
- preparar estrutura para conciliação futura.

### 8.7 Formas de Pagamento

O sistema deverá permitir:

- boleto;
- transferência;
- PIX;
- débito automático;
- cartão;
- dinheiro;
- cheque;
- compensação;
- outras formas configuráveis.

Cada forma poderá possuir parâmetros específicos.

### 8.8 Cadastro de Títulos

O sistema deverá permitir:

- criar título manualmente;
- gerar código interno único;
- informar empresa;
- informar filial;
- informar fornecedor;
- informar documento;
- informar número;
- informar série;
- informar data de emissão;
- informar data de competência;
- informar data de entrada;
- informar vencimento;
- informar valor original;
- informar moeda;
- informar descrição;
- informar categoria;
- informar centro de custo;
- informar projeto;
- informar forma de pagamento;
- informar conta bancária prevista;
- informar observações;
- incluir anexos;
- salvar como rascunho;
- validar antes da conclusão;
- duplicar título existente;
- copiar dados para novo lançamento.

### 8.9 Parcelamentos

O sistema deverá:

- permitir título único;
- permitir múltiplas parcelas;
- gerar parcelas automaticamente;
- definir periodicidade;
- distribuir valores;
- ajustar diferença de arredondamento;
- permitir alteração individual;
- manter vínculo com o título principal;
- permitir consulta consolidada;
- controlar status por parcela.

### 8.10 Recorrências

O sistema deverá:

- permitir lançamentos recorrentes;
- definir frequência;
- definir data inicial;
- definir data final;
- definir quantidade de ocorrências;
- gerar títulos futuros;
- permitir suspensão;
- permitir cancelamento da recorrência;
- registrar origem recorrente;
- evitar duplicidade de geração.

### 8.11 Rateios

O sistema deverá:

- permitir rateio por centro de custo;
- permitir rateio por projeto;
- permitir rateio por categoria;
- permitir rateio percentual;
- permitir rateio por valor;
- validar total de 100%;
- validar total financeiro;
- salvar modelos de rateio;
- permitir rateio padrão por fornecedor;
- permitir rateio diferente por parcela.

### 8.12 Aprovações

O sistema deverá:

- permitir ativar ou desativar aprovação por empresa;
- permitir alçada por valor;
- permitir múltiplos níveis;
- permitir aprovação sequencial;
- permitir aprovação paralela;
- permitir substituição temporária;
- permitir aprovar;
- permitir reprovar;
- permitir devolver para correção;
- exigir justificativa em reprovação;
- registrar usuário e data;
- enviar notificações;
- impedir pagamento sem aprovação final;
- permitir consulta da trilha de aprovação.

### 8.13 Programação de Pagamento

O sistema deverá:

- selecionar títulos aprovados;
- agrupar títulos;
- informar data prevista;
- informar conta bancária;
- informar forma de pagamento;
- informar lote;
- permitir revisão antes da execução;
- impedir títulos bloqueados;
- permitir exclusão da programação;
- registrar responsável;
- permitir filtros por vencimento, fornecedor e empresa.

### 8.14 Pagamentos

O sistema deverá:

- registrar pagamento integral;
- registrar pagamento parcial;
- registrar data;
- registrar conta bancária;
- registrar forma de pagamento;
- registrar valor pago;
- registrar juros;
- registrar multa;
- registrar desconto;
- registrar outros acréscimos;
- registrar número da transação;
- anexar comprovante;
- permitir baixa manual;
- preparar integração bancária futura;
- atualizar saldo do título;
- atualizar status;
- registrar auditoria.

### 8.15 Pagamentos Parciais

O sistema deverá:

- permitir múltiplos pagamentos no mesmo título;
- controlar saldo pendente;
- manter histórico;
- impedir pagamento acima do saldo, salvo regra configurada;
- recalcular status;
- permitir novo vencimento para saldo remanescente;
- registrar encargos por pagamento.

### 8.16 Cancelamentos

O sistema deverá:

- permitir cancelamento antes do pagamento;
- exigir justificativa;
- registrar usuário e data;
- impedir cancelamento indevido;
- retirar título das agendas;
- manter histórico;
- permitir autorização por perfil.

### 8.17 Estornos

O sistema deverá:

- permitir estorno de pagamento;
- exigir justificativa;
- restaurar saldo;
- restaurar status anterior;
- registrar usuário;
- registrar data;
- manter vínculo entre pagamento e estorno;
- impedir exclusão física do histórico;
- exigir permissão específica.

### 8.18 Anexos e Documentos

O sistema deverá:

- permitir múltiplos anexos;
- aceitar PDF e imagens;
- permitir classificação do anexo;
- armazenar nome original;
- armazenar data e usuário;
- restringir tamanho;
- controlar acesso;
- permitir download;
- manter anexos mesmo após cancelamento;
- preparar estrutura para armazenamento externo.

### 8.19 Agenda Financeira

O sistema deverá:

- apresentar visão diária;
- apresentar visão semanal;
- apresentar visão mensal;
- destacar vencidos;
- destacar vencimentos do dia;
- destacar próximos vencimentos;
- permitir filtros;
- abrir o título diretamente;
- apresentar totais por período;
- respeitar permissões;
- integrar-se ao dashboard.

### 8.20 Consulta e Listagem

A listagem deverá permitir:

- busca textual;
- filtros combinados;
- filtro por empresa;
- filtro por filial;
- filtro por fornecedor;
- filtro por vencimento;
- filtro por competência;
- filtro por status;
- filtro por categoria;
- filtro por centro de custo;
- filtro por projeto;
- filtro por forma de pagamento;
- filtro por conta bancária;
- filtro por usuário responsável;
- ordenação;
- paginação;
- seleção múltipla;
- ações em lote;
- exportação;
- salvamento de filtros;
- escolha de colunas;
- visualização do histórico.

### 8.21 Relatórios

Relatórios iniciais previstos:

- contas vencidas;
- contas a vencer;
- contas pagas;
- contas por fornecedor;
- contas por categoria;
- contas por centro de custo;
- contas por projeto;
- pagamentos por período;
- títulos cancelados;
- títulos estornados;
- títulos pendentes de aprovação;
- pagamentos parciais;
- fluxo de vencimentos;
- posição financeira por empresa;
- relatório de auditoria.

### 8.22 Indicadores

Indicadores iniciais:

- total a pagar;
- total vencido;
- total a vencer;
- total pago no período;
- quantidade de títulos;
- valor por status;
- valor por categoria;
- valor por centro de custo;
- valor por fornecedor;
- tempo médio de aprovação;
- percentual de pagamentos em atraso;
- descontos obtidos;
- juros e multas pagos;
- evolução mensal.

### 8.23 Auditoria

O sistema deverá registrar:

- inclusão;
- alteração;
- exclusão lógica;
- aprovação;
- reprovação;
- devolução;
- programação;
- pagamento;
- cancelamento;
- estorno;
- alteração de anexos;
- alteração de permissões;
- usuário;
- data e hora;
- valores anteriores;
- valores novos;
- endereço IP, quando aplicável;
- origem da operação.

---

## 9. Requisitos Não Funcionais

### 9.1 Segurança

- autenticação segura;
- autorização por perfil;
- permissões por ação;
- segregação por empresa;
- proteção contra acessos indevidos;
- senha armazenada de forma segura;
- sessão controlada;
- logs de autenticação;
- trilha de auditoria;
- proteção de anexos;
- política de expiração de sessão.

### 9.2 Desempenho

- listagens paginadas;
- consultas otimizadas;
- uso de índices;
- processamento assíncrono quando necessário;
- suporte a crescimento de volume;
- resposta adequada em operações comuns;
- relatórios pesados executados em segundo plano, quando aplicável.

### 9.3 Disponibilidade

- execução em Docker;
- suporte a ambiente Ubuntu;
- rotinas de backup;
- restauração documentada;
- monitoramento;
- logs estruturados;
- health check;
- recuperação após falhas.

### 9.4 Usabilidade

- padrão visual único;
- interface responsiva;
- mensagens claras;
- validações próximas ao campo;
- confirmação em ações críticas;
- navegação consistente;
- atalhos operacionais;
- acessibilidade progressiva.

### 9.5 Internacionalização

- moeda parametrizável;
- idioma parametrizável;
- formato de data parametrizável;
- fuso horário parametrizável;
- separadores decimais parametrizáveis;
- documentos fiscais configuráveis por país.

### 9.6 Manutenibilidade

- arquitetura modular;
- separação por camadas;
- código padronizado;
- documentação contínua;
- APIs documentadas;
- testes automatizados;
- migrations versionadas;
- baixo acoplamento;
- alta coesão.

---

## 10. Integrações Futuras

O módulo deverá ser preparado para futuras integrações com:

- bancos;
- CNAB;
- OFX;
- PIX;
- boletos;
- ERP externos;
- sistemas fiscais;
- serviços de armazenamento;
- sistemas de compras;
- contas a receber;
- fluxo de caixa;
- conciliação bancária;
- notificações por e-mail;
- notificações por WhatsApp;
- serviços de autenticação corporativa.

Essas integrações não fazem necessariamente parte do MVP, mas a arquitetura não deverá impedir sua implementação futura.

---

## 11. Premissas Iniciais

- O sistema será multiempresa.
- Cada registro possuirá vínculo com uma empresa.
- Exclusões relevantes serão lógicas.
- A auditoria será obrigatória.
- O módulo poderá operar sem integração bancária na primeira versão.
- A aprovação poderá ser configurável.
- Pagamentos parciais poderão ser configuráveis.
- A arquitetura deverá suportar filiais.
- A moeda inicial será BRL.
- O idioma inicial será Português do Brasil.
- O sistema deverá funcionar em navegador moderno.
- A aplicação será implantada em ambiente Docker.

---

## 12. Restrições Iniciais

- Não desenvolver integrações bancárias antes da definição funcional.
- Não incluir campos sem finalidade validada.
- Não permitir exclusão física de eventos financeiros auditáveis.
- Não permitir pagamento sem os controles mínimos.
- Não misturar regras de módulos distintos.
- Não criar telas fora do padrão oficial.
- Não iniciar modelagem definitiva antes da aprovação das necessidades.

---

## 13. Escopo Inicial do MVP

O MVP deverá contemplar, no mínimo:

- autenticação;
- usuários e perfis básicos;
- empresas;
- fornecedores;
- categorias;
- centros de custo;
- formas de pagamento;
- contas bancárias;
- cadastro de títulos;
- parcelas;
- anexos;
- listagem;
- filtros;
- aprovação simples;
- programação;
- baixa manual;
- pagamento integral;
- juros, multa e desconto;
- cancelamento;
- estorno;
- agenda financeira;
- dashboard inicial;
- relatórios essenciais;
- auditoria.

---

## 14. Itens Fora do MVP

Inicialmente poderão ficar fora do MVP:

- CNAB;
- OFX;
- conciliação automática;
- integração PIX;
- OCR de documentos;
- inteligência artificial;
- aplicativo móvel;
- workflow avançado de aprovação;
- multi-moeda operacional;
- retenções fiscais complexas;
- integrações com ERPs externos;
- notificações por WhatsApp;
- pagamentos automáticos.

---

## 15. Questões Pendentes para Validação

### 15.1 Estrutura Organizacional

1. O sistema será multiempresa desde o MVP?
2. Haverá filiais?
3. Um usuário poderá acessar várias empresas?
4. A consolidação entre empresas será necessária no MVP?

### 15.2 Fornecedores

5. Fornecedor poderá ser pessoa física e jurídica?
6. Haverá fornecedores estrangeiros?
7. Dados bancários serão obrigatórios?
8. Poderá existir mais de uma conta bancária por fornecedor?
9. Haverá processo de homologação?

### 15.3 Títulos

10. Quais campos serão obrigatórios?
11. O número do documento será obrigatório?
12. Será permitido título sem documento fiscal?
13. Como será detectada duplicidade?
14. Data de competência será obrigatória?
15. Haverá lançamento em moeda estrangeira?
16. Haverá retenções fiscais no MVP?

### 15.4 Aprovação

17. A aprovação será obrigatória?
18. Haverá alçadas por valor?
19. Quantos níveis serão necessários?
20. O lançador poderá aprovar o próprio título?
21. Aprovação será sequencial ou paralela?
22. Reprovação encerrará o processo ou devolverá para correção?

### 15.5 Pagamentos

23. Pagamento parcial será permitido?
24. Pagamento acima do saldo será permitido?
25. O sistema deverá controlar adiantamentos?
26. Será permitida compensação?
27. Haverá pagamento em lote?
28. Será necessário gerar arquivo bancário no MVP?

### 15.6 Rateios

29. Rateio será obrigatório em alguma situação?
30. O rateio será por valor, percentual ou ambos?
31. Um título poderá ser dividido entre empresas?
32. Haverá modelos de rateio?

### 15.7 Relatórios

33. Quais relatórios serão obrigatórios no MVP?
34. Será necessário exportar Excel?
35. Será necessário exportar PDF?
36. Haverá envio por e-mail?
37. Quais indicadores deverão aparecer no dashboard?

### 15.8 Segurança

38. Quais perfis iniciais serão criados?
39. Quem poderá estornar pagamentos?
40. Quem poderá cancelar títulos?
41. O auditor terá acesso a todas as empresas?
42. Haverá autenticação em dois fatores?

---

## 16. Critérios de Aceite do Documento

Este documento será considerado aprovado quando:

- os objetivos estiverem validados;
- o escopo do MVP estiver definido;
- os perfis de usuário estiverem confirmados;
- os processos principais estiverem mapeados;
- as necessidades funcionais estiverem revisadas;
- as necessidades não funcionais estiverem revisadas;
- as questões pendentes estiverem respondidas;
- o responsável funcional aprovar formalmente o conteúdo.

---

## 17. Próximo Documento

Após a aprovação deste levantamento, deverá ser elaborado:

**Documento 02 — Regras de Negócio do Módulo Contas a Pagar**

Esse documento deverá transformar cada necessidade aprovada em regras claras, numeradas, testáveis e rastreáveis.

---

## 18. Histórico de Alterações

| Versão | Data | Descrição | Status |
|---|---|---|---|
| 0.1 | 16/07/2026 | Estrutura inicial do levantamento | Rascunho |
| 0.2 | 16/07/2026 | Expansão completa das necessidades funcionais e não funcionais | Em elaboração |
