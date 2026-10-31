## 7. Próximo marco de projeto

### Cofre de certificados digitais A1 — pacote local em 20/09/2026

- Criada migration imutável no schema `integracoes` para um certificado A1
  ativo por empresa, com histórico de substituições e permissão dedicada.
- PFX e senha são protegidos por AES-256-GCM; a chave mestre permanece fora do
  banco em `CERTIFICATE_ENCRYPTION_KEY`.
- Backend valida formato, limite, senha, presença de chave privada, validade e
  compatibilidade do CNPJ antes de substituir o certificado vigente.
- Operações respeitam escopo multiempresa e são auditadas sem segredo.
- Frontend recebeu `Configurações > Certificados digitais`, com cadastro,
  situação de validade, revalidação e desativação; não há download do PFX.
- Integração SEFAZ ainda não foi implementada neste pacote. Ela deverá consumir
  o cofre internamente e observar NSU, rate limit, backoff e ambiente fiscal.

O próximo marco estratégico é retomar a sequência de correções operacionais a
partir do uso real do sistema, priorizando:

- recuperar o ambiente Debian e o vínculo Git desta cópia;
- validar os relatórios locais, especialmente `Previsto x pago`;
- tratar eventuais ajustes residuais observados na VPS após o deploy;
- definir o próximo pacote funcional antes de rodar nova validação completa;
- manter `NEXT_TASK.md` como ponteiro único da próxima tarefa executável.
