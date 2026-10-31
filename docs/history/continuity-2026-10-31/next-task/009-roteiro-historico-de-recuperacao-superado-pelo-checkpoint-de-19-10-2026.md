## Roteiro histórico de recuperação — superado pelo checkpoint de 19/10/2026

Revisar as diferenças locais e preparar o clone recuperado como workspace
Debian conforme o checkpoint acima. Depois, retomar a tarefa funcional já
aprovada a seguir.

### Validação funcional após recuperação do ambiente

Validar visualmente `Previsto x pago` com dados reais, especialmente parcelas
vencidas e pagas em meses diferentes, pagamentos parciais e estornos; conferir
usuário restrito, planilha e impressão. O usuário já aprovou a navegação e a
apresentação inicial de `Pagamentos realizados`. Depois da validação, executar
`./Checar_alteracao.sh` e publicar o pacote dos relatórios.

O roteiro abaixo descreve a validação anterior do relatório de compromissos
a pagar; seus totais contra a Agenda já foram confirmados pelo usuário.

Validar localmente o MVP `Relatório de compromissos a pagar`, conforme
`docs/REPORTS-PAYABLES-FORECAST.md`:

1. Conferir os totais contra Agenda e Notas Fiscais e Contas para o mesmo
   período.
2. Testar usuário Master e usuário restrito a uma empresa, confirmando que a
   visão global nunca ultrapassa as empresas autorizadas.
3. Validar os filtros rápidos:
   - hoje;
   - próximos 7 dias;
   - próxima semana, de segunda a domingo;
   - este mês;
   - próximo mês;
   - período personalizado.
4. Conferir filtros por empresa, fornecedor, categoria, situação e busca.
5. Conferir cards, agrupamentos por data/empresa, paginação e link para o
   título.
6. Ajustar eventuais divergências encontradas no teste visual.
7. Executar `./Checar_alteracao.sh` somente depois da validação local do usuário
   e antes do commit/deploy.

Pacote local implementado em 17/09/2026:

- novo endpoint `GET /api/v1/reports/payables-forecast`;
- escopo multiempresa aplicado no backend para Master e usuários restritos;
- totalizações de pendente, vencido, a vencer, parcelas e empresas;
- agrupamentos por data e empresa;
- detalhamento paginado com filtros e busca;
- rota `/reports` substitui o placeholder pela tela real;
- testes focados de API e frontend aprovados;
- typecheck de API e frontend aprovado;
- lint focado de API e frontend aprovado.

Ficam fora do primeiro pacote: contas a receber, projeção de entradas, saldo
futuro, conciliação, gráficos gerenciais complexos e exportação. Esses itens
continuam no roadmap e não devem ser apresentados como implementados.
