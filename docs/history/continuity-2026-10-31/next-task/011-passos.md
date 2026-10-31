## Passos

1. Manter fora do pacote, salvo decisão explícita:
   - `.venv`;
   - `.vscode/settings.json`;
   - arquivos `.docx` removidos/conversões não conferidas;
   - planilhas ou imagens não essenciais ao deploy.
2. Validar Administração de Usuários no backend com typecheck e testes focados.
3. Validar tela `/users`, login e `/password-reset` com teste focado,
   typecheck, lint e build.
4. Validar criação de fornecedor sem categoria explícita/status explícito em
   testes focados e garantir retorno HTTP 400 para violações obrigatórias não
   previstas.
5. Validar criação/edição de fornecedor com cidade digitada fora da lista,
   garantindo criação/vínculo em `cadastros.cities`.
6. Atualizar documentação viva (`PROJECT_STATUS.md`, `NEXT_TASK.md`,
   checklist/backlog multiempresa e docs de autenticação/autorização).
7. Validar o pacote com `./Checar_alteracao.sh`.
8. Criar commit local personalizado após `STATUS: OK`.
9. Fazer push somente quando o usuário validar/autorizá-lo.
10. Se o script retornar `STATUS: FAIL`, analisar o log indicado e voltar aos
    testes/correções normais.
11. Na VPS, verificar se a release usada contém
    `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
12. Na VPS, consultar `administracao.schema_versions` para as versões
    `202607231000` e `202607231010`.
13. Na VPS, consultar `to_regclass` das três tabelas de recorrência.
14. Se `schema_versions` não tiver as versões novas e as tabelas não existirem,
    aplicar as duas migrations de recorrência a partir da release publicada e
    registrar checksums.
15. Se `schema_versions` tiver a versão `202607231000`, mas as tabelas não
    existirem, remover apenas esse registro inconsistente depois de backup lógico
    ou aplicar reparo manual com registro correto.
16. Depois de corrigir o banco, repetir o deploy/verify.
17. Só então decidir entre:

- deploy controlado manual da branch/commit;
- ou publicação via workflow `Deploy Production`, se `main` estiver pronta.

18. Se usar workflow, abrir/mergear PR para `main` antes do acionamento manual,
    pois o workflow atual faz checkout fixo de `main`.
19. Se usar deploy manual, executar `/opt/fincontrol/bin/deploy` apontando para
    o SHA publicado escolhido.
20. Na VPS, configurar `PASSWORD_RESET_BASE_URL` e variáveis SMTP reais em
    `/opt/fincontrol/shared/.env`.
21. Após publicar esse pacote, decidir entre:
    - criar rotina administrativa de reprocessamento dos e-mails `FAILED` ou
      `PENDING`;
    - ou avançar para a próxima feature operacional do financeiro.
