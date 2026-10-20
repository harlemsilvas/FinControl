# Notas fiscais importadas — relatório e exportação

Data: 19/10/2026
Revisão visual e interações: 20/10/2026
Status: implementado, validado localmente pelo usuário e publicado na VPS em 20/10/2026.
Domínios: DOM-005 (relatório), DOM-002 (XMLs), DOM-004 (permissões/auditoria).

## Decisões e objetivo

O usuário validou a correção anterior dos filtros e solicitou relatório de
notas importadas por empresa e exportação segura por período/mês. Referências:
listagem com seleção e diálogo de exportação apresentados no chat.
Manter tema claro e identidade atual do FinControl.

Decisão explícita: baixar ZIP e enviar manualmente. Nenhum envio automático,
destinatário, integração de mensagens ou link público nesta primeira entrega.

Protótipo: `docs/wireframes/imported-invoices-proposal.html`, independente da
aplicação, com dados fictícios e geração apenas simulada. Não consulta banco,
não exporta documentos fiscais, não envia mensagens e não integra produção.

## Proposta visual

Menu: Relatórios > Notas fiscais importadas. A listagem operacional de XMLs
permanece para importação, reprocessamento e geração de contas.

- Cabeçalho: título, explicação curta, Imprimir relatório e Exportar XMLs.
- Cards: quantidade de notas, soma do valor das NFe, empresas e XMLs disponíveis.
  Totais sobre todo o resultado autorizado, não apenas sobre a página visível.
- Filtros: Empresa (ou Todas as empresas permitidas), Mês atual, Mês anterior,
  Período personalizado com somente Data inicial e Data final; busca por nota,
  série, fornecedor/CNPJ ou chave. Data de referência visível: emissão.
- Resumo por empresa com quantidade e valor, seguido do detalhamento.
- Colunas: seleção, nota/série, emissão, fornecedor, empresa destinatária,
  valor da NFe, disponibilidade do XML; detalhe preserva importação e vínculo
  financeiro. Evitar chamar processamento interno de situação fiscal.
- Seleção em lote com quantidade explícita. Mudar filtros limpa a seleção.
  Selecionar página e exportar todos os resultados são escopos distintos.
- Painel lateral de exportação com escopo, empresas, intervalo, quantidade,
  arquivos indisponíveis, tamanho calculado e organização do ZIP.
- Aba Histórico de exportações: autor, data, empresas, período, quantidade,
  situação da geração, validade e download; sem insinuar envio ao contador.
- Impressão com empresa/período e totais, sem navegação e controles.
  Planilha XLSX do relatório reaproveita o padrão existente, separada do ZIP.

A composição prioriza a listagem e usa um painel compacto para revisão, sem o
espaço vazio excessivo dos diálogos de referência. O protótipo ilustra o tema,
layout e interações; paginação, impressão definitiva e XLSX serão implementados
na aplicação oficial.

## Regras de dados e período

- Empresa proprietária: `financeiro.xml_imports.company_id`, resolvida no
  cadastro; não derivar autorização apenas do CNPJ digitado na interface.
- Usuário restrito consulta/exporta somente empresas permitidas, inclusive
  no consolidado, seleção por IDs, prévia, geração, histórico e download.
- IDs de empresa inexistentes ou não autorizados são rejeitados. Nunca ampliar
  o escopo silenciosamente para todas as empresas.
- Filtro por `issue_date` com início/fim inclusivos. Mês é mês civil completo,
  calculado no calendário `America/Sao_Paulo`, inclusive virada de ano e fevereiro.
- Notas sem emissão ficam identificadas em consulta própria; não usar a data
  de importação como substituição invisível para incluí-las num mês.
- Uma nota é contada uma vez; não multiplicar por parcelas ou pagamentos.
  Valor do relatório é `invoice_total_amount`, não valor de parcela/baixa.
- Excluir logicamente removidas da consulta padrão. Situação fiscal somente
  quando houver fonte fiscal persistida; status interno de importação não é
  autorização, cancelamento ou manifestação SEFAZ.
- Não prometer exportação de CC-e, cancelamentos ou DANFE: dependem de arquivos
  realmente armazenados e de escopo específico futuro, preservado no roadmap.

## Conteúdo do pacote

Exemplo conceitual:

```text
fincontrol_nfe_2026-10_<identificador>.zip
  empresa_<cnpj>/2026-10/xml/<chave-nfe>.xml
  resumo.csv
  manifesto.json
```

O resumo relaciona empresas, chave, nota/série, emissão, fornecedor e valor.
O manifesto contém versão do formato, ID do pacote, período, critérios de
seleção, contagens, caminhos e SHA-256 dos bytes de cada arquivo incluído.
Escapar conteúdo de CSV que possa ser interpretado como fórmula.

Exportar o conteúdo XML armazenado, sem reconstruir NFe a partir de dados
financeiros, modificar assinatura ou consultar SEFAZ durante a geração.
Hoje existe `raw_xml` como texto e metadados/hash da origem. Não prometer
identidade byte a byte com o arquivo originalmente recebido sem conferir a
codificação/BOM: hash da origem e hash dos bytes exportados são conceitos
distintos. Confirmar a origem disponível, incluindo possíveis anexos legados,
antes de declarar o arquivo exportável.

Nomes são gerados no servidor com componentes saneados, sem caminhos externos,
sem traversal e sem colisões. Não usar nome de arquivo enviado pelo cliente.
Duplicidades de chave não podem sobrescrever arquivos silenciosamente.

## Fluxo confiável

1. Consultar o relatório e aplicar empresa/período.
2. Escolher todos os resultados filtrados ou IDs selecionados, inclusive
   tratamento explícito da paginação. O backend recalcula o escopo autorizado.
3. Prévia registra o conjunto exato de IDs/versões, critérios e permissões,
   sem depender de uma lista limitada carregada no navegador.
4. Exibir quantidade incluível, indisponíveis, motivo e tamanho estimado.
   Se houver indisponíveis, exigir escolha explícita antes de gerar um pacote
   parcial. Nunca comunicar exportação completa se faltaram arquivos.
5. Gerar a partir dessa prévia com identificador/idempotência; se o conteúdo,
   autorização ou seleção mudar, invalidar e solicitar nova prévia.
6. Compactar com limites de notas, período, tamanho e tempo, definidos após
   medir o volume real. Pacotes maiores precisam de processamento controlado;
   não carregar todo o acervo irrestritamente na memória da API.
7. Conferir manifesto, entradas e contagens antes de marcar o pacote PRONTO.
   Geração incompleta/falha não disponibiliza arquivo final como válido.
8. Download autenticado, com revalidação de acesso às empresas do pacote.
   Arquivos privados fora do webroot, com expiração e limpeza dos temporários.
9. Registrar geração e solicitações de download na auditoria, sem XML bruto
   nem segredos nos logs. Download solicitado não comprova recebimento ou envio.

Histórico persistente de pacotes e permissões dedicadas de consulta/exportação
exigirão migration nova, após o desenho técnico; migrations antigas imutáveis.
A definição final de limites e retenção deve constar da configuração validada.
Nenhum objeto de aplicação no schema public.

## Integração proposta

- Reaproveitar React/Fastify, componentes, httpClient e exportadores oficiais.
- Relatório e XLSX em DOM-005, sem duplicar regras de filtro da exportação.
- Seleção de XMLs e política de acesso compartilhadas no backend; não reutilizar
  diretamente uma listagem sem conferir autorização multiempresa em cada operação.
- Permissões dedicadas para consultar relatório e gerar/baixar pacotes, usando
  o modelo de perfis atual. Definir códigos ao desenhar os contratos oficiais.
- O caminho do ZIP nunca é recebido do cliente; usar identificador opaco.
- Não adicionar envio SMTP neste pacote. Futuro envio por e-mail requer decisão
  explícita, destinatário revisado, limites, idempotência e estados próprios.

## Critérios de aceite para implementação

- Master e usuário restrito; tentativa de exportar ID de outra empresa e
  revogação de acesso entre prévia e download.
- Mesmo filtro gera mesmos totais no relatório, XLSX e manifesto.
- Limites de mês/dia, fevereiro, dezembro/janeiro e execução sob host UTC.
- Nota emitida em setembro/importada em outubro pertence a setembro.
- Seleção em múltiplas páginas; mudança de filtro; seleção vazia; nota removida.
- Sem XML, XML legado, codificação/BOM, duplicidade de chave, conteúdo alterado
  após prévia e nomes maliciosos. Não incluir documentos inacessíveis.
- ZIP abre em ferramentas comuns e hashes/totais correspondem ao conteúdo.
- Falha/interrupção, repetição do clique, expiração e limites de volume.
- Impressão, XLSX, acessibilidade, responsividade e auditoria sem dados brutos.

## Sequência de entrega

1. Revisar a proposta visual; fluxo inicial ZIP/manual já decidido pelo usuário.
2. Desenhar contratos, escopo de autorização, armazenamento e migration nova.
3. Implementar relatório por empresa e prévia usando dados reais.
4. Implementar geração, validação, download e histórico auditável.
5. Validar com base local atualizada e executar Checar_alteracao.sh no pacote
   completo antes de publicação. Deploy desta nova feature ainda não solicitado.

Relatórios financeiros anteriores continuam na continuidade; esta proposta não
constitui aprovação financeira automática de funcionalidades anteriores.

## Validação do protótipo em 20/10/2026

- Revisado no Chrome em 1600px e 390px; corrigido encaixe dos filtros no celular.
- Interações verificadas com DOM executável: totais, empresa, mês anterior,
  seleção, troca/limpeza de filtros, busca sem resultados, datas invertidas,
  abertura/fechamento do painel, foco/Escape e abas.
- Exportação parcial simulada exige confirmação explícita antes de habilitar
  a geração; o painel informa a quantidade de XMLs indisponíveis.
- Prévias: `docs/wireframes/imported-invoices-proposal.png` e
  `docs/wireframes/imported-invoices-export-proposal.png`.
- O HTML pode ser aberto diretamente no navegador, sem dependências externas;
  fragmento `#export` abre a proposta do painel de exportação.
- Os meses demonstrativos estão fixados em setembro/outubro de 2026, com
  identificação de dados fictícios. Isso não define o relógio da implementação.
- Na etapa do protótipo não houve alteração na aplicação, migrations ou banco.
  O pacote real e sua checagem completa estão registrados abaixo.

## Implementação real — 20/10/2026

### Escopo aprovado

Somente importações manuais. A origem MANUAL é persistida em xml_imports e
filtrada pelo backend; a automação DFe/Sintegra permanece em
FUTURE-SEFAZ-DFE-DISTRIBUTION.md e na tela de Features.

Acesso: Relatórios > Notas fiscais importadas, rota
`/reports/imported-invoices`. Permissões XML_REPORT_VIEW e XML_EXPORT_MANAGE,
atribuídas inicialmente ao perfil MASTER por migration nova. A lista de
empresas do usuário autenticado é reaplicada em todas as operações. Os pacotes
são pessoais: mesmo outro usuário com acesso às empresas não recebe o pacote
alheio. Revogar acesso a uma empresa bloqueia o pacote inteiro.

O relatório apresenta totais de todo o filtro, resumo por empresa, paginação,
seleção entre páginas, impressão e planilha XLSX. Mudança de filtro limpa a
seleção. Campos sem valor de nota são identificados, não reinterpretados como
valor zero. O indicador de XML armazenado mostra presença de conteúdo; a prévia
confere se esse conteúdo pode ser incluído e informa incompatibilidades.

### Contratos

- GET /api/v1/reports/imported-invoices: from, to, companyId, search, page, pageSize.
- GET /api/v1/reports/imported-invoices/export-data: mesmo filtro, conjunto
  completo limitado para impressão/XLSX; totais e grupos no mesmo snapshot.
- POST /api/v1/xml-exports/preview: filtro e ids opcionais; sem ids significa
  todos os resultados do filtro, nunca somente a página visível.
- POST /api/v1/xml-exports/:id/generate: allowPartial explícito quando houver
  indisponíveis; chamada idempotente para um pacote já pronto.
- GET /api/v1/xml-exports: histórico pessoal paginado.
- GET /api/v1/xml-exports/:id/download: ZIP autenticado, no-store, SHA conferido.
- DELETE /api/v1/xml-exports/:id: descarta conteúdo e mantém histórico/auditoria.

### Persistência e limites

Migration 202610201200_financeiro_create_xml_export_packages.sql. O ZIP fica
como bytea em financeiro.xml_export_packages, e não em diretório público.
Decisão técnica: com o limite pequeno desta entrega, persistir atomicamente
conteúdo, hash e estado no banco evita arquivos órfãos e caminhos manipuláveis.
Essa decisão substitui o diretório temporário sugerido no desenho inicial.

Limites configuráveis e validados:

- XML_EXPORT_MAX_NOTES: padrão/teto 500; também limita impressão/XLSX completos.
- XML_EXPORT_MAX_BYTES: padrão/teto 20971520 (20 MiB) de XML por pacote.
- XML_EXPORT_RETENTION_HOURS: padrão 48, de 1 até 168 horas.
- Intervalo de consulta: até 366 dias; página de até 100 notas (interface: 20).
- Até 20 pacotes ativos por usuário; pode descartar anteriores para liberar espaço.
- Uma geração por vez no banco, protegida por advisory lock; outras recebem
  orientação para tentar novamente. Lock de linha e retentativas limitadas
  de serialização protegem cliques concorrentes no mesmo pacote.

Conteúdos expirados são removidos em lotes de até 100 na inicialização da API
e a cada minuto enquanto ela está em execução; histórico permanece. Expiração
é conferida também no download, independentemente da limpeza. Quando a API
estiver desligada, a remoção física espera a próxima inicialização. Backups
existentes seguem sua política de retenção própria.

Prévia captura IDs e fingerprints dos metadados/conteúdo. A geração reconsulta
somente esses IDs, verifica alterações e monta XMLs sem reconstrução fiscal.
Mudança, remoção ou perda de acesso invalida o fluxo. Snapshot não contém XML
bruto. Uma consulta posterior não acrescenta notas novas a um pacote existente.

Conteúdo vazio/legado sem XML e codificação declarada diferente de UTF-8 são
identificados como indisponíveis; não alterar declaração ou assinatura para
simular recuperação. Exportações parciais exigem confirmação. ZIP pronto é
aberto novamente com verificação CRC32, e cada XML é comparado com SHA-256.
CSV protegido contra fórmulas; nomes construídos pelo servidor, com colisões
bloqueadas. Falhas não liberam artefatos incompletos.

### Operação local

Backup privado antes da migration:
`backup/fincontrol_pre_invoice_module_20261020.dump`.
Migration validada primeiro em fincontrol_invoice_validation_20261020 e depois
aplicada e registrada na base ativa fincontrol_validation_20261019. A verificação
oficial de estrutura passou. Nenhum dado financeiro foi reescrito; pacotes e
respectivos eventos são registros operacionais novos.

### Verificações

Testes dedicados cobrem integridade/bytes UTF-8, manifesto, CSV, colisões,
autorização, mudança de conteúdo, geração concorrente, limites, expiração,
rotas HTTP autenticadas, permissões atuais e descarte. Tela testada para
seleção, filtro de empresa, confirmação parcial e permissões; meses testados
sob UTC na virada do ano e em fevereiro bissexto.

A auditoria npm de produção apontou dois avisos altos preexistentes em
@fastify/busboy e node-forge, sem aviso na dependência ZIP adicionada. O segundo
não apresentou correção automática na consulta. Não executar upgrade amplo
ou afirmar que o repositório está sem vulnerabilidades. Relatório privado:
.local/npm-audit-invoices.json. Revisão de dependências registrada como pendência
separada da funcionalidade, sem alterar bibliotecas adjacentes neste pacote.

### Validação final local

- `Checar_alteracao.sh`: STATUS OK, log
  `logs/alteracoes/checar_alteracao_20261020_113244.log`.
- Integração PostgreSQL/HTTP dedicada: 6 testes aprovados em base isolada.
- Testes puros de ZIP: 4 aprovados; testes da tela/período: 4 aprovados.
- Chrome com dados reais: nota 26466 em setembro, seleção, prévia, geração,
  download ZIP e abertura/verificação CRC32/SHA-256 aprovados. XLSX baixado e
  aberto; histórico conferido e layout móvel sem overflow global.
- PDF real conferido: nota e valor presentes; navegação, usuário do cabeçalho
  e filtros ausentes. Impressão/XLSX usam dados e totais do mesmo snapshot.
- Evidências reais somente em `.local/` (não versionadas); protótipo com dados
  fictícios preservado em docs/wireframes. Sessões temporárias de QA revogadas.
- Dados financeiros locais preservados: 201 títulos, 192 pagamentos;
  schema_versions com 59 migrations. API/frontend disponíveis localmente.
- Sem commit, push ou deploy desta feature. Validação visual pelo usuário e
  publicação controlada são os próximos passos.

## Publicação de produção — 20/10/2026

Commit 478bcb735c415d26d1c2e04cacde229f50ad4aec publicado e implantado pelo
workflow Deploy VPS Native 39453420210, com preflight e deploy aprovados.
CI 39453405475 aprovado. Backup pré-deploy concluído antes da migration
202610201200; verificação estrutural PASS. SHA público confirmado, rota do
relatório HTTP 200 e health API/PostgreSQL ok. Log privado em
.local/deploy-39453420210.log. Conferência autenticada do ZIP na VPS pelo
usuário é o próximo passo; validação completa anterior foi local.
