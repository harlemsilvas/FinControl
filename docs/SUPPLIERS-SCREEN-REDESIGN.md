# Revisão do Cadastro de Fornecedores

Data: 18/07/2026

## Objetivo

Consolidar a referência funcional da nova tela de fornecedores antes de seguir com novas migrations, alterações de API e reformulação do frontend.

Este documento existe para evitar que a implementação continue evoluindo sem um contrato claro entre:

- tela alvo;
- modelo atual do banco;
- contrato atual da API;
- comportamento atual do frontend;
- novas necessidades de negócio.

## Referências visuais utilizadas

Pasta de referência informada pelo usuário:

- `C:\projetos\telas\fornecedor`

Telas revisadas:

- `Cadastro Fornecedores - Dados Gerais.png`
- `Cadastro Fornecedores - Dados Financeiros.png`
- `Cadastro Fornecedores - Documentos.png`
- `Cadastro Fornecedores - Informações Complementares.png`
- `Cadastro Fornecedores - Pedidos.png`

## Estado atual implementado

Hoje o cadastro de fornecedores já possui:

- tipo de fornecedor: `INDIVIDUAL | COMPANY | FOREIGN`;
- razão social / nome;
- nome fantasia;
- documento;
- país;
- e-mail principal;
- telefone;
- celular;
- telefone adicional;
- representante em texto livre;
- ativo;
- aprovado;
- bloqueado.

Modelo atual no banco:

- tabela `cadastros.suppliers`
- migrations base:
  - `202607162120_cadastros_create_master_data.sql`
  - `202607181020_cadastros_add_supplier_contact_fields.sql`

## Leitura funcional da tela alvo

A tela alvo não é apenas um redesenho visual. Ela representa uma ampliação real do domínio de fornecedores.

As abas identificadas são:

1. Dados Gerais
2. Dados Financeiros
3. Documentos
4. Informações Complementares
5. Pedidos

Isso indica que o fornecedor passa a concentrar:

- dados cadastrais;
- dados fiscais;
- endereço estruturado;
- múltiplos contatos especializados;
- preferências financeiras;
- documentos com validade e alertas;
- classificações internas;
- relacionamento com compras/pedidos;
- indicadores operacionais.

## Diretriz recomendada

Não seguir direto para migrations novas com base apenas no layout.

A melhor sequência é:

1. homologar a especificação funcional da tela;
2. mapear campos atuais x desejados;
3. classificar impacto por camada;
4. dividir em entregas por fase;
5. só então gerar migrations e refatorações.

## Classificação de impacto

### Grupo A — já existe no modelo atual

Campos já cobertos ou quase cobertos:

- Nome / Razão Social → `legalName`
- Nome Fantasia → `tradeName`
- Tipo de Pessoa → `supplierType`
- CPF/CNPJ/Documento → `documentNumber`
- País → `countryCode`
- E-mail Principal → `email`
- Telefone Comercial → `phone`
- Celular / WhatsApp → `mobilePhone`
- Telefone adicional → `secondaryPhone`
- Situação / Ativo → `isActive`

### Grupo B — existe parcialmente, mas precisa redefinição funcional

- Representante
  - hoje é `representativeName` em texto livre; fica esse
  - precisa decidir se continuará texto livre ou se virará vínculo com usuário/contato/comprador.

- Status
  - na tela aparecem `Status` e `Situação`; [ Deixe somente Status ]
  - hoje o modelo só possui `isActive`, `isApproved`, `isBlocked`;  [ `isActive`, `isBlocked` ]
  - precisa unificar conceito antes de modelar. [ verificado ]

- Categoria
  - na tela aparece como atributo do fornecedor;
  - hoje não existe campo específico para categoria de fornecedor;
  - precisa decidir se será:
    - enum/domínio simples;
    - tabela mestre; 
    - marcador/tag.

    [ Tabela mestre, com campos: id, nome, descricao, status (pode internacionalizar os nomes de campo ) ] 

- Marcador
  - na tela aparece como seleção/tag;
  - hoje fornecedor não possui relação estruturada com marcadores. 

  [ marcadores serão usados em diversas telas, e cadastros. Vamos usar em fornecedores, contas, entre outros. Veja a melhor forma de usa-los, com opção de ativo/inativo no cadastro. Relatórios por marcador serão necessários, já coloque em Features ]

### Grupo C — não existe e exige modelagem nova

#### Dados Gerais / fiscais

- inscrição estadual; 
- inscrição municipal. [opcional, pode acrescentar o campo no modelo]

#### Endereço

- CEP;
- logradouro;
- número;
- complemento;
- bairro;
- cidade;
- estado.

#### Contatos

- e-mail financeiro; 
- possível distinção formal entre celular e WhatsApp; [não necessarios, a maioria é celular/whatsapp]
- possível contato por área/finalidade.  [ posteriormente podemos expandir os contatos para uma tabela, e aí definimos o escopo]

#### Dados financeiros 

- forma de pagamento preferencial;
- condição de pagamento;
- prazo médio;
- dia preferencial de pagamento;
- periodicidade;
- antecedência para vencimento;
- multa por atraso;
- juros ao mês;
- dados bancários do fornecedor;
- limites/configurações;
- centro de custo padrão;
- plano de contas padrão;
- retenções e impostos;
- observação financeira.

[ os campos nem sempre serão obrigatorios, somente os que fazem parte do contexto e geração de datas ]

#### Documentos [ somente faremos upload de notas fiscais/xml para inserir os dados financeiros de pagto ]

- upload de arquivos por fornecedor; [inicialmente não teremos]
- tipo documental; 
- número do documento;
- data de emissão;
- data de validade;
- status documental;
- alerta pré-vencimento;
- bloqueio por documento vencido;
- observações de documentos.

#### Informações complementares

- tipo de fornecedor; 
- segmento; [nao necessário]
- classificação; [nao necessário]
- nível de risco; [nao necessário]
- responsável interno; 
- comprador responsável; [nao necessário] 
- data de início de relacionamento; 
- código interno; 
- canal preferencial de contato; 
- idioma;  [nao necessário]
- prazo de entrega padrão;
- pedido mínimo; 
- transportadora preferencial; 
- modalidade de frete;  
- horário de recebimento; [nao necessário]
- dias para recebimento;  
- código no ERP;  [nao necessário]
- origem do cadastro;  [nao necessário]
- flags operacionais e comerciais; 
- grupo econômico;  [nao necessário]
- região de atendimento;  [nao necessário]
- certificações;  [nao necessário]
- tags;
- informações adicionais. 

#### Pedidos [ somente tela, sem uso real pois não faz parte do escopo]

- histórico de pedidos;
- indicadores de compra;
- ações sobre pedidos;
- acompanhamento de entregas.

Observação importante:

A aba `Pedidos` claramente depende de um módulo de compras/pedidos, que hoje não faz parte do escopo já implementado do fornecedor. Portanto, não deve virar migration imediata sem decisão de fase.

## Matriz inicial: atual x desejado

| Área | Campo da tela alvo | Situação atual | Ação recomendada |
|---|---|---:|---|
| Dados Gerais | Nome / Razão Social | Existe | Reaproveitar |
| Dados Gerais | Nome Fantasia | Existe | Reaproveitar |
| Dados Gerais | Tipo de Pessoa | Existe | Reaproveitar |
| Dados Gerais | CPF/CNPJ | Existe | Reaproveitar |
| Dados Gerais | Status | Parcial | Definir conceito |
| Dados Gerais | Situação | Parcial | Definir conceito |
| Dados Gerais | Inscrição Estadual | Não existe | Nova modelagem |
| Dados Gerais | Inscrição Municipal | Não existe | Nova modelagem |
| Dados Gerais | Categoria | Não existe | Definir domínio |
| Endereço | CEP | Não existe | Nova modelagem |
| Endereço | Logradouro | Não existe | Nova modelagem |
| Endereço | Número | Não existe | Nova modelagem |
| Endereço | Complemento | Não existe | Nova modelagem |
| Endereço | Bairro | Não existe | Nova modelagem |
| Endereço | Cidade | Não existe | Nova modelagem |
| Endereço | Estado | Não existe | Nova modelagem |
| Endereço | País | Parcial | Expandir além de `countryCode` |
| Contatos | Telefone Comercial | Existe | Reaproveitar |
| Contatos | Celular / WhatsApp | Parcial | Refinar regra |
| Contatos | E-mail Principal | Existe | Reaproveitar |
| Contatos | E-mail Financeiro | Não existe | Nova modelagem |
| Marcador | Marcador | Não existe | Nova modelagem |
| Financeiro | Condições de Pagamento | Não existe | Nova modelagem |
| Financeiro | Dados Bancários | Não existe | Nova modelagem |
| Financeiro | Retenções/Impostos | Não existe | Nova modelagem |
| Documentos | Arquivos e validade | Não existe | Nova modelagem |
| Complementares | Classificações internas | Não existe | Nova modelagem |
| Pedidos | Histórico e métricas | Não existe | Depende de módulo futuro |

## Proposta de implementação por ondas

### Onda 1 — estabilização de Dados Gerais

Escopo recomendado para a primeira evolução:

- consolidar a especificação de `Dados Gerais`;
- decidir `Status` x `Situação`;
- adicionar IE e IM;
- adicionar endereço estruturado;
- adicionar e-mail financeiro;
- decidir categoria de fornecedor;
- decidir marcadores;
- revisar layout da aba `Dados Gerais`.

Resultado esperado:

- nova tela de dados gerais consistente;
- API de fornecedor preparada;
- migrations controladas e limitadas ao que realmente é necessário.

### Onda 2 — Dados Financeiros e Documentos

- preferências financeiras;
- dados bancários;
- retenções e impostos;
- upload documental;
- validade e alertas.

Resultado esperado:

- fornecedor passa a ter perfil financeiro e documental utilizável.

### Onda 3 — Informações Complementares

- classificações internas;
- campos operacionais;
- certificações;
- tags;
- integrações futuras.

### Onda 4 — Pedidos

Somente quando o módulo de compras/pedidos estiver oficialmente modelado.

## Decisões funcionais pendentes

Antes de gerar a próxima leva de migrations, precisamos definir:

1. `Status` e `Situação` são campos diferentes ou apenas nomes visuais diferentes? [coloquei no começo do documento] 
2. `Categoria` do fornecedor será:
   - simples;
   - tabela própria; [tabela própria geral de categorias, que usaremos em outros locais se necessarios, coloquei acima no começo do documento ]
   - marcador/tag?
3. `Representante` continua texto livre?
4. `Celular / WhatsApp` será:
   - um único campo; [unico]
   - dois campos distintos;
   - campo + flag de WhatsApp?
5. `Cidade`, `Estado` e `País` serão:
   - texto livre;
   - domínios internos;
   - integração com base externa [vamos criar tabela de Estado, cidade, texto livre, ou busca na base do IBGE atraves do CEP, pais manteremos somente BR por enquanto]
6. `Marcador` será reutilização de tags genéricas ou novo cadastro mestre? [novo cadastro mestre onde teremos tags generiacas]
7. `Pedidos` entra agora apenas como placeholder visual ou sai da primeira entrega? [place holder]

## Recomendação final

Para o fornecedor, o melhor próximo passo não é codificar a tela inteira nem gerar migrations amplas.

O melhor próximo passo é:

1. aprovar este mapa funcional;
2. fechar a definição da aba `Dados Gerais`;
3. transformar somente essa aba em especificação técnica;
4. gerar migrations novas apenas para o que entrar nessa primeira onda.

## Próximo entregável sugerido

Criar um segundo documento derivado deste:

- `docs/SUPPLIERS-DADOS-GERAIS-SPEC.md`

Com:

- layout lógico da aba;
- campos obrigatórios e opcionais;
- regras de validação;
- mapeamento exato banco/API/frontend;
- lista exata de migrations necessárias para a Onda 1.
