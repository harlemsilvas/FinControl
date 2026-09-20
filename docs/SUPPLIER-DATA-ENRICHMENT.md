# Enriquecimento de fornecedores

## Objetivo

Completar o cadastro de fornecedores sem substituir dados já revisados pelo
usuário e sem tratar uma consulta pública como comprovação fiscal.

## Origem XML

Na importação de NFe, o emitente fornece razão social, nome fantasia, CNPJ/CPF,
inscrição estadual, endereço e telefone. Fornecedores novos recebem os campos
disponíveis. Fornecedores existentes recebem somente valores para campos
vazios; dados preenchidos manualmente não são sobrescritos.

## Consulta por CNPJ

A tela de fornecedor oferece `Consultar CNPJ` para pessoas jurídicas. A API do
FinControl consulta o provedor configurado por `CNPJ_LOOKUP_BASE_URL` e devolve
somente os campos necessários ao formulário. O resultado é pré-preenchido, mas
o usuário precisa revisar e salvar o cadastro.

O provedor inicial é a BrasilAPI, agregador de dados públicos. A Receita Federal
oferece consulta manual pública; sua integração automatizada oficial via
Serpro exige contratação, e-CNPJ e credenciais. O serviço foi isolado para que
o provedor possa ser substituído futuramente sem alterar a tela.

## Segurança e limites

- consulta disponível somente para usuário com `MASTER_DATA_MANAGE`;
- CNPJ deve conter 14 dígitos;
- chamada externa possui timeout de 10 segundos;
- indisponibilidade externa não impede o cadastro manual;
- nenhum dado retornado é salvo automaticamente;
- consulta não confirma regularidade fiscal, inscrição estadual ou situação no
  Sintegra.
