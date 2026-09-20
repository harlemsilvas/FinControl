# Certificados digitais A1

## Escopo inicial

O FinControl cadastra um certificado A1 (`.pfx` ou `.p12`) ativo por empresa.
Este pacote cuida do cofre e do ciclo de vida da credencial. A consulta e a
distribuicao de DF-e na SEFAZ serao conectadas ao cofre em uma etapa posterior.
Certificados A3, token e smart card nao fazem parte deste escopo.

## Seguranca

- PFX e senha sao armazenados juntos em um payload AES-256-GCM no PostgreSQL.
- Cada payload usa IV aleatorio e AAD vinculado ao certificado e a empresa.
- A chave mestre fica somente em `CERTIFICATE_ENCRYPTION_KEY`, fora do banco.
- API, logs, auditoria e frontend nunca retornam PFX, senha ou chave privada.
- O upload aceita apenas `.pfx`/`.p12`, possui limite de 5 MB e exige chave
  privada, senha valida, certificado vigente e CNPJ compativel quando o CNPJ
  puder ser extraido do certificado.
- Cadastro, validacao e desativacao exigem `DIGITAL_CERTIFICATE_MANAGE` e
  respeitam o escopo de empresas do usuario.

## Configuracao

Gere a chave uma unica vez e armazene-a no `.env` da API e no gerenciador de
segredos/backup operacional da VPS:

```bash
openssl rand -base64 32
```

```dotenv
CERTIFICATE_ENCRYPTION_KEY=<resultado-base64>
```

Nao troque ou perca essa chave enquanto houver certificados cadastrados. O dump
do banco, sozinho, nao permite recuperar o PFX; para restore completo, a chave
do ambiente precisa ser preservada separadamente e com acesso restrito.

## Operacao

1. Aplique a migration `202609201500_integracoes_create_company_digital_certificates.sql`.
2. Configure e reinicie a API.
3. Acesse `Configuracoes > Certificados digitais`.
4. Escolha a empresa, o arquivo A1 e informe a senha.
5. Confira titular, validade e situacao; use `Validar` para testar a abertura
   posterior do payload cifrado.

A substituicao e atomica: o certificado anterior so e inativado depois que o
novo certificado passa por todas as validacoes.

## Proxima etapa

- implementar cliente SEFAZ em processo isolado, com mTLS e timeouts;
- consumir o certificado por identificador, sem material sensivel em payloads;
- controlar NSU, rate limit, backoff e `cStat 656` de forma persistente;
- separar homologacao e producao conforme os parametros da empresa;
- auditar consultas sem registrar XML fiscal completo ou credenciais em logs.
