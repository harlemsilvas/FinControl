# Tela de Baixa de Pagamentos

## Correções :

- Os itens listados foram analisados, e sugerimos algumas alterações. Veja o que pode ser feito já, e o que envolve estudo de caso.

Correções:

- Substituir o Card Pagamentos Parciais, por Pagamentos Efetuados. Não temos pagamento parcial de contas no sistema, então crie um totalizador monetário para Pagamentos Efetuados e coloque no Card Pagamentos Efetuados.
- O card Pagamentos Efetuados deve exibir o valor total pago filtrado, não a quantidade de pagamentos.
- A tag de status do histórico de pagamentos deve ficar em posição própria, sem cobrir o valor pago.
- o card Atrasado na Fila, não esta totalizando.
- Filtros
  - Abertos
  - Atrasado
  - Parcialmente Pago (Excluir esse, pois o pagamento do boleto é Integral)
  - Pagos
  - Todos
- Quando um boleto não é original de um xml, ou seja um boleto sem origem, cadastrado como Pagamento Recorrente ou Não, Ele não aparece como Atrasadp, mesmo que esteja Vencido.
- O campo Todos os fornecedores, deve ser Busca, e não um Select preenchido, pois quando eu tiver 100 fornecedores, ficaria inviável, deixe um campo Busca conforme vai digitando, ele vai te dando as opções que tem.
- Temos um aba Parcelas elegíveis e outra abaixo Pagamentos realizados. Mexendo nas alterações acima, acredito que os a aba Pagamentos Realizados não seja necessária, já que os cards de totais e os filtros modificados, vão ter a mesma função. Ou se ela realmente tiver necessidades, colocaria em um quadro, com duas abas, em vez de estender a pagina.
