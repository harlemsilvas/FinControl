# Conector DFe → FinControl (NF-e de entrada)

Atualizado em 31/10/2026. Substitui, para este fluxo, a hipótese de consumir a SEFAZ direto de
[FUTURE-SEFAZ-DFE-DISTRIBUTION.md](FUTURE-SEFAZ-DFE-DISTRIBUTION.md): a coleta fiscal fica no
DFe-SEFAZ Enhanced (outro repositório) e o FinControl só lê o resultado.

## Decisões (aprovadas pelo usuário em 31/10/2026)

- **Pull**: o FinControl consulta o DFe; o DFe nunca chama o FinControl.
- **Rede interna**: os dois sistemas estão na mesma VPS; o DFe não expõe `/api/integracao` no Nginx público.
- **Chave estática por consumidor** (`X-DFE-Integracao-Key`), somente leitura, escopo por empresa.
- **Somente `procNFe` completos** de entrada. Resumos (`resNFe`) não entram.
- **Sem conta a pagar automática**: a nota entra como `RECEIVED` na lista de XML importados, para revisão.

## Fluxo

1. Uma rodada serializada, no intervalo da agenda (abaixo), lista as empresas autorizadas à chave
   e processa só as cadastradas e ativas em `cadastros.companies`.
2. Por empresa, lê o cursor em `integracoes.dfe_sync_cursors`, pagina `nfe-entrada?apos_nsu=` e baixa o XML de cada nota.
3. Parser no servidor (`nfe-xml-parser.ts`, mesmas regras do parser do web) → `PayablesRepository.createXmlImport`
   com `importSource: 'DFE_API'`.
4. O cursor avança nota a nota; ao fim da página confirma o NSU ao DFe (melhor esforço).

## Agenda por horário

As notas chegam em dias úteis, das 7h às 18h; fora disso a demanda é pequena. Cada rodada reagenda a próxima:

| Quando (fuso America/Sao_Paulo) | Intervalo | Variável |
|---|---|---|
| Segunda a sexta, de `DFE_SYNC_BUSINESS_START_HOUR` (7) até `DFE_SYNC_BUSINESS_END_HOUR` (18, exclusive) | 300 s | `DFE_SYNC_INTERVAL_SECONDS` |
| Demais horários e fins de semana | 1800 s | `DFE_SYNC_OFFPEAK_INTERVAL_SECONDS` |

Feriados não são tratados (valem como dia útil). A regra está em `dfe-sync-schedule.ts`, com testes.

## Regras de segurança e consistência

- Duplicata por chave (`XML_IMPORT_DUPLICATE`) conta como já importada. Reprocessar é seguro.
- Nota cuja destinatária não é a empresa consultada é ignorada; XML inválido ou chave divergente é ignorado e logado.
- **XML ainda não disponível (404) → aguardar.** O portal do DFe nem sempre libera a nota completa na hora em que o
  `procNFe` aparece na distribuição. O conector interrompe a empresa **sem avançar o cursor**, grava `last_error`
  ("XML ainda indisponivel no DFe (NSU ...)") e tenta de novo na rodada seguinte, sem pular nenhuma nota.
  5xx e falhas de rede seguem a mesma regra.
  **Ressalva (decisão de 31/10/2026):** ainda não foi validado no DFe da VPS se todo `procNFe` acaba com XML disponível.
  Se existir NSU que nunca ganha XML, a empresa fica parada nele; validar depois no DFe e, se necessário, definir
  um prazo máximo de espera antes de pular e registrar. Hoje não há prazo.
- Mensagens de erro e `last_error` nunca contêm corpo de resposta, XML ou chave de API.
- `DOCTYPE`/`ENTITY` são rejeitados e o XML é limitado a 5 MB.
- Relatórios e exportação de notas importadas continuam só com `MANUAL`.

## Ativar (feito em produção em 01/11/2026; passos mantidos como referência)

1. Backup do banco; aplicar `database/migrations/202610311900_integracoes_create_dfe_sync_cursors.sql`.
2. No DFe: aplicar a migration 006 e criar a chave (`backend/scripts/criar_cliente_integracao.py NOME CNPJ...`).
3. No `.env` do FinControl: `DFE_API_BASE_URL` (rede interna), `DFE_API_KEY`, `DFE_SYNC_USER_ID` (usuário existente),
   depois `DFE_SYNC_ENABLED=true` e reiniciar a API.
4. Acompanhar `integracoes.dfe_sync_cursors` (`last_nsu`, `last_success_at`, `last_error`) e o log `DFe sync`.

## Validação feita

typecheck e lint limpos; 144 testes unitários; 14 de integração em PostgreSQL 16 descartável com as 60 migrations;
cliente e parser contra a API real do DFe local (listagem, XML real, confirmação, 401 com chave errada).

## Operação em produção (01/11/2026)

- DFe e FinControl rodam no mesmo host: o FinControl (PM2, nativo) acessa o DFe em `http://127.0.0.1:18003`;
  o Nginx público nega `/api/integracao` (403).
- Uma chave por consumidor, com todas as empresas do consumidor no mesmo cliente
  (`criar_cliente_integracao.py fincontrol CNPJ1 CNPJ2`). Cada execução do script cria um cliente novo; o nome é único.
- Se o sync parar no 1º NSU com "XML ainda indisponivel": verificar no DFe se o arquivo existe e se a API o enxerga
  (`DFE_INTEGRACAO_XML_ROOTS`; caminhos relativos são resolvidos a partir da raiz do release e de `backend/`).
- O `.env` é carregado com `source` pelo deploy: valores sem `< >`, sem espaços em volta do `=`.
