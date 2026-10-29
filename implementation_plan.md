# Plano de Implementação — Lançamento unificado (causa + repasse)

**Projeto:** FerreiraDash · **Status:** rascunho para revisão (nenhum código alterado)

## 1. Objetivo

Hoje existem dois fluxos separados: **Lançamento** e **Repasse**. Na prática são a mesma operação: o escritório recebe um valor de uma causa, fica com um percentual (ex.: 30%) e o restante é do cliente.

Novo comportamento:

1. Um único formulário de lançamento de causa: valor total + percentual do escritório + parcelas.
2. O sistema calcula automaticamente, por parcela, a parte do escritório e a parte do cliente.
3. A página inicial mostra, sem digitação adicional:
   - **Próximos repasses ao cliente** (quanto cada cliente deve receber);
   - **Próximas entradas do escritório** (a fatia de 30% de cada parcela).

Exemplo: causa de R$ 10.000, 30% → escritório R$ 3.000, cliente R$ 7.000. Em 4 parcelas: cada parcela de R$ 2.500 gera R$ 750 (escritório) + R$ 1.750 (cliente).

## 2. Problema que isso também resolve

O fluxo atual de repasse cria três lançamentos (alvará total, honorários e repasse ao cliente) e soma tudo no saldo. O resultado é que a receita do escritório é contada em dobro (saldo = 2Y em vez de Y) e o dinheiro do cliente infla o saldo. O novo modelo elimina isso por construção.

## 3. Modelo de dados proposto

Novas tabelas (as despesas e entradas simples continuam em `Transacao`):

**`Recebimento`** — a causa/acordo
- `id`, `processoId`, `valorTotal`, `percentualEscritorio`, `numeroParcelas`, `dataPrimeiroVencimento`, `diaVencimento`, `observacoes`, `createdAt`

**`Parcela`** — uma linha por parcela (à vista = 1 parcela)
- `id`, `recebimentoId`, `numero`, `vencimento`
- `valorParcela`, `valorEscritorio`, `valorCliente` (calculados e gravados)
- `statusRecebimento`: `PENDENTE` | `RECEBIDO` + `dataRecebimento`
- `statusRepasse`: `PENDENTE` | `REPASSADO` + `dataRepasse`

**Regras de cálculo** (em `Decimal`, nunca `float`)
- `valorParcela = valorTotal / N`; a diferença de centavos vai para a última parcela.
- O total do escritório é calculado uma vez (`round(valorTotal × pct, 2)`) e repartido entre as parcelas: cada uma recebe sua parte arredondada para baixo e os centavos que sobram vão para as parcelas com maior fração cortada (empate: as últimas). Assim a soma da parte do escritório sempre bate com o percentual do total.
- `valorCliente = valorParcela − valorEscritorio`.
- O valor de cada parcela pode ser editado na prévia (ex.: entrada maior), desde que a soma continue igual ao `valorTotal`.
- **Datas:** o dia do mês da 1ª parcela se repete nas seguintes. Ex.: 5 parcelas com 1º vencimento em 20/11 → 20/11, 20/12, 20/01, 20/02, 20/03. Cada `Parcela` guarda seu `vencimento` já calculado (editável individualmente se uma data mudar).
- **Dia inexistente no mês** (ex.: dia 31 em fevereiro): usa o último dia do mês, sem perder o dia-base nas parcelas seguintes.
- **Fim de semana:** se o vencimento cair em sábado ou domingo, a parcela passa para a **segunda-feira seguinte**. O dia-base original (ex.: 20) é preservado para calcular as parcelas seguintes. Feriados não são considerados.
- `vencimento` é gravado como data pura (`@db.Date`), sem hora, para não mudar de dia por causa do fuso.
- Invariante validada no servidor: `escritório + cliente = parcela` e `Σ parcelas = valorTotal`.

**Tratamento do saldo (recomendado)**
- Saldo do escritório = apenas `valorEscritorio` das parcelas **recebidas** − despesas pagas.
- A parte do cliente **não entra** no saldo; aparece num indicador separado: "Valores de clientes a repassar".

## 4. Telas e fluxo

1. **Formulário "Novo lançamento"** com seletor de tipo:
   - *Causa / recebimento* (novo fluxo unificado);
   - *Despesa ou outra entrada* (fluxo simples atual).
2. No tipo *Causa*: número do processo (com busca Datajud), cliente, valor total, % do escritório (padrão 30, editável), nº de parcelas, **data do 1º vencimento** (o mesmo dia do mês se repete nas demais parcelas).
3. **Prévia ao vivo** antes de salvar: "Escritório R$ X · Cliente R$ Y" e tabela de parcelas **com a data de cada vencimento**, que pode ser ajustada antes de salvar.
4. **Dashboard** — dois cards novos alimentados por `Parcela`:
   - *Próximas entradas do escritório*: parcelas com `statusRecebimento = PENDENTE`, ordenadas por vencimento, mostrando `valorEscritorio`.
   - *Próximos repasses ao cliente*: parcelas ainda não repassadas, mostrando `valorCliente`, com selo "aguardando recebimento" ou "pronto para repassar" (quando a parcela já foi recebida).
5. Ações: marcar parcela como recebida; marcar repasse como feito (com anexo do comprovante).
6. Remover a aba/página "Repasse" da navegação.

## 5. Fases

| Fase | Entrega | Observações |
|------|---------|-------------|
| 1 ✅ | Senha de acesso + migration do schema (`Recebimento`, `Parcela`) e função de cálculo com testes | Passar a usar `prisma migrate` em vez de `db push` (banco ainda sem dados reais, então a migração inicial é simples); instalar Vitest; tirar `--accept-data-loss` do `db:setup`; corrigir `.env.example` (PostgreSQL, `DIRECT_URL`, VAPID, `CRON_SECRET`) |
| 2 ✅ | API: criar recebimento, marcar parcela recebida, marcar repasse | Validação com zod em todas as rotas |
| 3 ✅ | Formulário unificado com prévia ao vivo | Reaproveita busca Datajud |
| 4 ✅ | Dashboard: novos cards e novo cálculo de saldo | Agregações no banco (sem carregar tudo em memória). Tela /recebimentos. **Pendente:** anexo do comprovante de repasse, depende de mover uploads para o Supabase Storage |
| 5 ✅ | Notificações push integradas às parcelas (ver seção 5.1) | Aviso no dia do vencimento, com cliente, valor e processo |
| 6 ✅ | Remoção do fluxo antigo de repasse | Não há dados antigos para migrar |

## 5.1 Notificações integradas às parcelas

Hoje a rota `/api/push/send-notifications` olha as `Transacao` pendentes do dia. Passa a olhar `Parcela`.

- **Gatilho:** um cron chama a rota **duas vezes ao dia, às 8h e às 19h** (horário de Brasília), protegida pelo `CRON_SECRET` como já é hoje, usando a data de `America/Sao_Paulo`.
  - **8h:** resumo do que vence hoje (a receber) e repasses prontos para fazer.
  - **19h:** lembrete do que ainda está pendente no dia (parcelas de hoje não marcadas como recebidas) e atrasadas.
  - Cuidado com o fuso: o cron-job.org deve estar configurado em horário de Brasília, ou os horários ficam deslocados em 3h.
- **Dia do vencimento — a receber:** parcelas com `vencimento = hoje` e `statusRecebimento = PENDENTE`.
  Texto: "Hoje tem pagamento: [empresa/reclamada] · Cliente: [cliente] · parcela 2/5 · R$ 2.500 (seu escritório: R$ 750) · Proc. [número]". Tanto o **nome da empresa** quanto o **nome do cliente** aparecem em toda notificação.
- **Repasse a fazer:** quando a parcela é marcada como recebida, ela passa a "pronta para repassar". O aviso do dia seguinte lembra do repasse pendente ao cliente (R$ 1.750).
- **Atrasadas:** parcelas vencidas e não recebidas entram num aviso resumido diário até serem resolvidas.
- **Várias parcelas no mesmo dia:** agrupar em uma única notificação ("3 pagamentos hoje") para não gerar spam.
- **Pré-requisito técnico:** confirmar que o cron realmente está agendado no ambiente de produção e que as chaves VAPID e o `CRON_SECRET` estão configurados (o `.env.example` atual não lista essas variáveis).
- Ao tocar na notificação, abre direto a parcela (ou o histórico filtrado por aquele dia).

## 6. Decisões em aberto (preciso da sua confirmação)

1. **Parcelas:** o percentual de 30% se aplica a cada parcela recebida (o cliente recebe proporcionalmente a cada parcela)? Premissa deste plano: sim.
2. **Percentual:** fixo em 30% ou editável por causa? Premissa: padrão 30%, editável.
3. **Saldo:** adotar a opção recomendada (só a parte do escritório no saldo, com indicador separado de valores de clientes)?
4. **Sucumbência e honorários contratuais:** continuam como lançamento simples, com 100% para o escritório?
5. ~~**Notificações:** horário~~ — **decidido:** 8h e 19h, horário de Brasília, com nome da empresa e do cliente.
6. ~~**Vencimento em fim de semana**~~ — **decidido:** passa para a segunda-feira seguinte.
7. ~~**Feriados**~~ — **decidido:** não serão considerados.
8. ~~**Dados existentes**~~ — **decidido:** não há repasses antigos; o sistema está começando agora.

## 7. Fora do escopo deste plano

Login com usuários: **decidido** não implementar. O sistema é de uso interno (dono + 1 funcionário). Em vez disso, há uma **senha única** (`APP_PASSWORD`) que protege todas as telas e APIs (feito na fase 1).

## 8. Riscos

- Arredondamento de centavos: mitigado com `Decimal` e ajuste na última parcela.
- Mudança de contas do dashboard altera o saldo exibido; os números antigos estavam inflados.
