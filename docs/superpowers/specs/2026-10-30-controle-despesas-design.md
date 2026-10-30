# Controle de despesas — desenho

Data: 30/10/2026

## Objetivo

Ter num lugar só tudo o que sai do escritório, mês a mês: advogados (audiências e
petições), salários e custos operacionais (aluguel, internet, tráfego pago…), com o
que já foi pago e o que falta pagar. Despesas fixas (salário, aluguel, tráfego) não
precisam ser lançadas à mão todo mês.

## O que o usuário pediu (decidido)

- Ao lançar uma saída de **Custo Operacional**, o formulário não pede causa, processo
  nem cliente: só o nome do custo, o valor e se é recorrente (além de data e status).
- **Recorrente** = o app cria sozinho o lançamento de cada mês, como pendente, no
  mesmo dia e valor. Para de repetir com um botão "Parar de repetir".
- Só Custo Operacional e a nova categoria **Salário** usam o formulário simples;
  Advogado/Colaborador, Audiência e Repasse continuam como estão.
- Uma tela **Despesas** do mês, com total, quanto foi para cada tipo e a lista.

## Suposições (corrigir se estiver errado)

- **Repasse ao cliente não é despesa**: é dinheiro do cliente passando pelo escritório.
  Fica fora da tela Despesas (continua no Histórico).
- **Tráfego pago** é um custo operacional recorrente (ex.: "Tráfego pago – Google"),
  sem categoria própria.
- **Salário** é uma categoria nova de saída; o nome do custo é o nome do funcionário.

## 1. Formulário (aba "Outro" de Lançar)

- Saída + categoria **Custo Operacional** ou **Salário** → formulário simples:
  - Nome (obrigatório). Custo: "Aluguel", "Tráfego pago – Google". Salário: nome do funcionário.
  - Valor, data de vencimento, status (já existem).
  - Chave **"Repetir todo mês"**.
  - Somem: bloco "Informações da Causa / Processo" e "Contato / Cliente".
- Demais categorias: formulário igual ao de hoje.
- A troca é pelo `slug` da categoria (`CUSTO_OPERACIONAL`, `SALARIO`), não pelo nome,
  para continuar funcionando se a categoria for renomeada.

## 2. Despesas recorrentes

**Banco**
- Nova tabela `despesas_recorrentes`: id, nome, valor, dia do vencimento (1–31),
  categoria, ativa (sim/não), **último mês criado** (AAAA-MM), criada/atualizada em.
- `transacoes` ganha `recorrencia_id` (opcional), apontando de qual recorrência veio.
- Categoria nova `Salário` (slug `SALARIO`, saída), criada na migration.
- Nada existente muda; hoje não há lançamentos avulsos cadastrados.

**Cadastro**
- Com "Repetir todo mês" marcado: cria a recorrência e o lançamento deste mês na hora,
  já ligado a ela.

**Criação automática**
- Função pura `mesesQueFaltam(recorrencia, hoje)` → vencimentos a criar: todos os meses
  depois do "último mês criado" até o mês atual, se a recorrência está ativa (normalmente
  só um; mais de um se o disparo ficou um mês sem rodar). Dia que não existe no mês
  (31 em fevereiro) vira o último dia do mês.
- Cria os lançamentos e avança o "último mês criado" na mesma transação do banco, com a
  condição de que ele ainda seja o valor lido — dois disparos ao mesmo tempo não duplicam.
- O disparo diário das 8h (`/api/push/send-notifications?turno=manha`, chamado pelo
  pg_cron do Supabase) roda a criação **antes** de montar os avisos, então a despesa
  do dia já entra no aviso. Também roda ao abrir a tela Despesas, para não depender
  só do horário.
- Se falhar a criação, os avisos saem mesmo assim (o erro vai para o log).

**Editar e parar**
- Editar um lançamento muda só aquele mês (ex.: conta mais cara).
- No lançamento recorrente: "Mudar valor dos próximos meses" (altera a recorrência) e
  "Parar de repetir" (marca inativa). Meses já criados continuam no histórico.
- Excluir um lançamento de um mês não recria aquele mês (o "último mês criado" não volta).

## 3. Tela Despesas (`/despesas`)

- Seletor de mês (padrão: mês atual).
- Topo: **total do mês**, **pago** e **falta pagar**.
- Por tipo, com valor e quantidade:
  - **Advogados**: audiências e petições com valor, mais lançamentos da categoria
    Advogado/Colaborador.
  - **Salários**.
  - **Custos operacionais**.
  - **Outras saídas**: lançamentos de saída de outras categorias (exceto repasse).
- Lista do mês embaixo (mais recente primeiro), com etiqueta "Recorrente" quando for o
  caso e link para abrir/editar cada item; filtro por tipo tocando no resumo.
- Data usada: vencimento/data prevista; para pagos, a data do pagamento (igual ao Histórico).
- Reaproveita `listarMovimentos()` de `src/lib/extrato.ts`, filtrando saídas e separando
  por tipo numa função pura testada.
- Menu: novo item "Despesas". No celular, a barra de baixo tem 5 itens; "Despesas"
  entra no lugar de "Histórico", que vai para o menu de ajustes (topo). *(A confirmar.)*

## 4. Testes

- `mesesQueFaltam`: mês atual criado uma vez só, meses atrasados recuperados, dia 31 em
  fevereiro, virada do ano, recorrência parada.
- Agrupamento da tela Despesas: cada origem cai no tipo certo, repasse fica de fora,
  totais pago/falta pagar.
- Formulário: com Custo Operacional/Salário os campos de causa não aparecem e o nome é
  obrigatório.
- Conferência no app publicado (o banco local não está configurado nesta máquina).

## Fora do escopo

- Orçamento/limite por tipo, gráficos de meses anteriores, despesas com fim definido
  (número de meses), lembrete antes do vencimento.
