# Futuro — Distribuicao DF-e via SEFAZ

## Objetivo

Consumir o Web Service `NFeDistribuicaoDFe` com o certificado A1 cadastrado para
cada empresa, permitindo localizar documentos fiscais de interesse sem depender
exclusivamente do upload manual de XML.

## Limites funcionais

- Esta integracao nao substitui a consulta cadastral de fornecedores.
- A consulta publica por CNPJ continua com provedor cadastral dedicado.
- A SEFAZ deve retornar somente documentos em que a empresa seja ator
  autorizado, conforme as regras do Ambiente Nacional da NF-e.
- Nenhum documento encontrado deve gerar conta automaticamente sem regra e
  revisao explicitamente aprovadas.

## Esqueleto de referencia

O projeto local `/mnt/c/Projetos/dfe-sefaz-enhanced` possui implementacao
funcional que pode orientar envelope SOAP, mTLS, leitura de lotes e tratamento
inicial das respostas. Ele deve ser tratado somente como referencia: nao copiar
certificados, senhas, XMLs, `.env`, dados de runtime ou decisoes de seguranca sem
revisao para a arquitetura do FinControl.

## Arquitetura prevista

1. Consumir internamente o cofre `integracoes.company_digital_certificates`.
2. Validar que o CNPJ-base consultado corresponde ao certificado.
3. Manter cursor de ultimo NSU por empresa e ambiente fiscal.
4. Executar consultas serializadas, com timeout, retentativa limitada e backoff.
5. Tratar `cStat 137`, `138`, `656` e demais retornos sem loops agressivos.
6. Armazenar documentos e resumos idempotentemente pela chave/NSU.
7. Apresentar fila de documentos para revisao e importacao no Financeiro.
8. Auditar operacoes sem registrar PFX, senha, chave privada ou XML integral em
   logs de aplicacao.

## Fora do primeiro pacote

- manifestacao do destinatario;
- emissao ou cancelamento de NF-e;
- consulta cadastral oficial da Receita/Serpro;
- importacao financeira totalmente automatica;
- suporte a certificado A3.

## Decisão de escopo em 20/10/2026

O usuário aprovou o relatório e a exportação das notas importadas manualmente.
A importação automática, referida como DFe/Sintegra, permanece uma feature
futura. Confirmar provedor, origem e contratos dessa integração antes de
implementá-la; não inferir equivalência entre serviços apenas pelo nome.
Nenhuma consulta, monitor ou importação automática foi ativada nesta entrega.
A coluna import_source registra MANUAL e exige nova migration para futuras
origens; não classificar automaticamente documentos externos como manuais.
