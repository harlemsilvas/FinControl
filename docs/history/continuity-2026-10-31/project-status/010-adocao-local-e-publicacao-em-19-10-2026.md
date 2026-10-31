## Adoção local e publicação em 19/10/2026

- `.env` aponta para `fincontrol_validation_20261019`; base `fincontrol`
  preservada. Configuração anterior privada em `.local/env.before-adopt-20261019`.
- API readiness confirmou a nova base e frontend respondeu HTTP 200 na porta
  5173. Consulta real pelo repositório confirmou 201 títulos, 192 pagamentos,
  fuso São Paulo, nota 26466 em setembro e ausente no filtro de outubro.
- Rotina de deploy ajustada para aplicar/verificar fuso PostgreSQL existente
  e sincronizar arquivos PM2/Compose; sintaxe Bash aprovada.
- Necessárias duas execuções do mesmo SHA na primeira publicação: o script
  instalado anterior instala a versão nova para a execução seguinte.
- Esse registro precedeu a publicação; conclusão no checkpoint acima.
