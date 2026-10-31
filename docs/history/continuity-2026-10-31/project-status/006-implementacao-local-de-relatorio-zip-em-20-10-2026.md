## Implementação local de relatório/ZIP em 20/10/2026

- Telas aprovadas pelo usuário. Escopo explícito: somente notas importadas
  manualmente; DFe/Sintegra mantido como feature futura.
- Implementados relatório por empresa/emissão, impressão, XLSX, seleção,
  prévia, ZIP conferido, download autorizado e histórico pessoal auditável.
- Origem MANUAL e tabela de pacotes em migration nova 202610201200, testada
  primeiro em banco separado e aplicada localmente após backup privado.
- Verificação oficial de estrutura aprovada. Testes PostgreSQL reais cobriram
  isolamento, confirmação parcial, concorrência, expiração e endpoints HTTP.
- Checar_alteracao.sh STATUS OK, log checar_alteracao_20261020_113244.log.
  Testes dedicados: 4 ZIP, 4 UI e 6 integrações PostgreSQL/HTTP aprovados.
- Chrome com nota real 26466 validou filtro, seleção, prévia, ZIP conferido,
  XLSX, histórico e largura móvel; PDF validado sem navegação/filtros.
- Sessões temporárias de QA revogadas; artefatos reais privados em .local/.
  Dados financeiros preservados: 201 títulos, 192 pagamentos, 59 migrations.
- Sem commit, push ou deploy desta nova funcionalidade. Próximo passo:
  avaliação do usuário e publicação controlada quando solicitada.
- Alertas de dependências preexistentes documentados para revisão separada;
  não declarar zero vulnerabilidades com base nas verificações antigas.
