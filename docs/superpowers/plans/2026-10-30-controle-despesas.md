# Controle de Despesas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formulário simples para Custo Operacional e Salário, despesas que se repetem todo mês sozinhas e uma tela Despesas do mês.

**Architecture:** Tabela nova `despesas_recorrentes` com o "último mês criado"; uma função pura decide quais meses faltam e um serviço cria os lançamentos (chamado no disparo das 8h e ao abrir /despesas). A tela Despesas reaproveita `listarMovimentos()` e agrupa por tipo numa função pura.

**Tech Stack:** Next.js 15 (app router), Prisma + PostgreSQL (Supabase), Zod, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-30-controle-despesas-design.md`

## Global Constraints

- Datas "puras" em `AAAA-MM-DD`; mês em `AAAA-MM`. Gravar com `dataParaDb`, ler com `dataDoDb` (`src/lib/datas.ts`). "Hoje" sempre `hojeSaoPaulo()`.
- Dinheiro: `Prisma.Decimal` no banco; na tela, `formatCurrency` de `src/lib/utils.ts`.
- Categorias são reconhecidas pelo `slug` (`CUSTO_OPERACIONAL`, `SALARIO`, `ADVOGADO_COLABORADOR`, `AUDIENCIA`, `REPASSE_CLIENTE`), nunca pelo nome.
- Toda tabela nova recebe `ALTER TABLE "<tabela>" ENABLE ROW LEVEL SECURITY;` na migration.
- Textos da interface em português, no tom do app.
- Testes só de funções puras (`src/**/*.test.ts`); o banco local não está configurado nesta máquina.
- Rodar ao fim de cada tarefa: `npx vitest run`, `npx tsc --noEmit`, `npx next lint`.

## Review Focus

- Recorrência criada num dia 31 → nos meses curtos vence no último dia (30/11, 28/02) e volta a 31 em dezembro. (Tarefa 2)
- Dois disparos ao mesmo tempo (8h + alguém abrindo /despesas) → o mês é criado uma vez só. (Tarefa 3, update condicional)
- Mudar o valor da recorrência → meses já criados ficam com o valor antigo. (Tarefa 3)
- Lançamento de custo sem cliente → aparece na lista com o nome do custo, não "Sem nome". (Tarefa 5)
- Virada de mês no fuso de Brasília (31/10 às 22h UTC-3 ainda é outubro). (Tarefa 2, `hoje` vem de `hojeSaoPaulo`)

---

### Task 1: Banco — recorrências e categoria Salário

**Files:**
- Modify: `prisma/schema.prisma` (model `Transacao`; novo model `DespesaRecorrente`)
- Create: `prisma/migrations/20261030000000_despesas_recorrentes/migration.sql`
- Modify: `prisma/seed.ts` (categoria Salário)

**Interfaces:**
- Produces: model `DespesaRecorrente { id, nome, valor Decimal(14,2), diaVencimento Int, categoriaId, ativa Boolean @default(true), ultimoMes String /* AAAA-MM */, createdAt, updatedAt, transacoes Transacao[] }` mapeado para `despesas_recorrentes` (colunas snake_case); `Transacao.recorrenciaId String?` (`recorrencia_id`, FK com `onDelete: SetNull`, `@@index([recorrenciaId])`); `Categoria.recorrencias DespesaRecorrente[]`.

- [ ] **Step 1:** Editar o schema conforme Interfaces.
- [ ] **Step 2:** Escrever a migration SQL à mão (não há banco local), no padrão de `20261029050000_advogados_pix`: CREATE TABLE, ALTER TABLE "transacoes" ADD COLUMN "recorrencia_id", CREATE INDEX, as duas FKs; terminar com `ALTER TABLE "despesas_recorrentes" ENABLE ROW LEVEL SECURITY;`. Revisar o SQL linha a linha contra o schema (nomes de coluna, tipos, `ON DELETE SET NULL`).
- [ ] **Step 3:** Em `prisma/seed.ts`, adicionar `{ nome: "Salário", slug: "SALARIO", tipo: "SAIDA" }`.
- [ ] **Step 4:** Rodar `npx prisma validate && npx prisma generate && npx tsc --noEmit`. Esperado: sem erros.
- [ ] **Step 5:** Commit `feat: tabela de despesas recorrentes e categoria Salario`.

### Task 2: Regra dos meses que faltam (pura)

**Files:**
- Create: `src/lib/recorrencias.ts`
- Test: `src/lib/recorrencias.test.ts`

**Interfaces:**
- Produces:
  - `mesDe(data: string): string` — `"2026-10-31"` → `"2026-10"`.
  - `proximoMes(mes: string): string` — `"2026-12"` → `"2027-01"`.
  - `vencimentoNoMes(mes: string, dia: number): string` — dia limitado ao último dia do mês. **Sem** ajuste de fim de semana.
  - `mesesQueFaltam(r: { ativa: boolean; ultimoMes: string; diaVencimento: number }, hoje: string): string[]` — vencimentos (`AAAA-MM-DD`) de cada mês depois de `ultimoMes` até `mesDe(hoje)`, inclusive; `[]` se inativa ou já em dia.

- [ ] **Step 1: Testes que falham**

```ts
expect(vencimentoNoMes("2026-11", 31)).toBe("2026-11-30");
expect(vencimentoNoMes("2027-02", 31)).toBe("2027-02-28");
expect(vencimentoNoMes("2028-02", 30)).toBe("2028-02-29");
expect(proximoMes("2026-12")).toBe("2027-01");
const r = { ativa: true, ultimoMes: "2026-10", diaVencimento: 31 };
expect(mesesQueFaltam(r, "2026-10-31")).toEqual([]);                 // já criado
expect(mesesQueFaltam(r, "2026-11-01")).toEqual(["2026-11-30"]);
expect(mesesQueFaltam(r, "2027-01-05")).toEqual(["2026-11-30", "2026-12-31", "2027-01-31"]); // atrasados
expect(mesesQueFaltam({ ...r, ativa: false }, "2027-01-05")).toEqual([]);
expect(mesesQueFaltam({ ...r, ultimoMes: "2026-12" }, "2026-11-15")).toEqual([]); // último mês no futuro
```

- [ ] **Step 2:** `npx vitest run src/lib/recorrencias.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar as quatro funções.
- [ ] **Step 4:** Rodar de novo → PASS.
- [ ] **Step 5:** Commit `feat: regra dos meses que faltam nas despesas recorrentes`.

### Task 3: Serviço e API das recorrências

**Files:**
- Create: `src/lib/despesas-recorrentes.ts`
- Modify: `src/app/api/transacoes/route.ts` (POST aceita `recorrente`)
- Create: `src/app/api/recorrencias/[id]/route.ts` (PATCH)
- Modify: `src/app/api/push/send-notifications/route.ts`
- Modify: `src/lib/validations.ts`

**Interfaces:**
- Consumes: `mesesQueFaltam`, `mesDe` (Task 2).
- Produces:
  - `gerarDespesasRecorrentes(hoje?: string): Promise<number>` — para cada recorrência ativa, cria os lançamentos de `mesesQueFaltam` (tipo SAIDA, status PENDENTE, `descricao = nome`, `valor`, `categoriaId`, `dataCompetencia = dataParaDb(venc)`, `recorrenciaId`) e avança `ultimoMes` numa `prisma.$transaction`, usando `updateMany({ where: { id, ultimoMes: <lido> } })` primeiro; se `count === 0`, outro disparo já criou → aborta essa recorrência sem criar. Retorna quantos lançamentos criou.
  - `transacaoSchema` ganha `recorrente: z.boolean().optional()`; nova `recorrenciaPatchSchema = z.object({ valor: z.number().positive().optional(), ativa: z.literal(false).optional() })`.
  - POST `/api/transacoes` com `recorrente=true` (FormData `"true"`): exige `descricao` não vazia e categoria com slug `CUSTO_OPERACIONAL` ou `SALARIO` (senão 400 "Só custos operacionais e salários podem se repetir."). Cria a `DespesaRecorrente` (`diaVencimento` = dia de `dataCompetencia`, `ultimoMes = mesDe(dataCompetencia)`) e o lançamento ligado a ela, numa transação.
  - PATCH `/api/recorrencias/[id]` com JSON `{ valor }` muda o valor dos próximos meses; `{ ativa: false }` para de repetir. 404 se não existir.

- [ ] **Step 1:** Validação e serviço conforme Interfaces.
- [ ] **Step 2:** POST de transações e rota PATCH de recorrências.
- [ ] **Step 3:** No disparo de notificações, quando `turno === "manha"`, chamar `await gerarDespesasRecorrentes(hoje)` antes de `buscarDadosDoDia`, dentro de `try/catch` próprio que só faz `console.error("[recorrencias]", err)`; incluir `despesasCriadas` no JSON de resposta.
- [ ] **Step 4:** `npx vitest run && npx tsc --noEmit && npx next lint` → sem erros.
- [ ] **Step 5:** Commit `feat: despesas recorrentes criadas sozinhas no disparo das 8h`.

### Task 4: Formulário simples e botões da recorrência

**Files:**
- Modify: `src/components/forms/lancamento-form.tsx`
- Modify: `src/app/lancamentos/novo/page.tsx` (categorias com `slug`; edição traz `recorrencia: { id, valor, ativa } | null`)
- Modify: `src/components/forms/form-wrapper.tsx` (só se os tipos de `Props` exigirem)
- Create: `src/lib/formulario-lancamento.ts`
- Test: `src/lib/formulario-lancamento.test.ts`

**Interfaces:**
- Consumes: POST `/api/transacoes` com `recorrente`, PATCH `/api/recorrencias/[id]` (Task 3).
- Produces: `usaFormularioSimples(tipo: "ENTRADA" | "SAIDA", slug: string | null | undefined): boolean` — `true` só para SAIDA com slug `CUSTO_OPERACIONAL` ou `SALARIO`.

- [ ] **Step 1: Teste que falha**

```ts
expect(usaFormularioSimples("SAIDA", "CUSTO_OPERACIONAL")).toBe(true);
expect(usaFormularioSimples("SAIDA", "SALARIO")).toBe(true);
expect(usaFormularioSimples("SAIDA", "AUDIENCIA")).toBe(false);
expect(usaFormularioSimples("ENTRADA", "CUSTO_OPERACIONAL")).toBe(false);
expect(usaFormularioSimples("SAIDA", null)).toBe(false);
```

- [ ] **Step 2:** Rodar → FAIL; implementar; rodar → PASS.
- [ ] **Step 3:** No formulário, com formulário simples:
  - esconder o bloco "Informações da Causa / Processo" e "Contato / Cliente" (e não enviar esses campos);
  - "Descrição" vira **"Nome do custo"** (Custo Operacional, placeholder "Ex.: Aluguel, Tráfego pago – Google") ou **"Nome do funcionário"** (Salário), obrigatório, erro "Informe o nome.";
  - "Data da Competência" vira **"Vencimento"**;
  - chave **"Repetir todo mês"** (só ao criar), texto de ajuda "O app lança sozinho todo mês, no mesmo dia, como pendente.";
- [ ] **Step 4:** Na edição de um lançamento com recorrência ativa: aviso "Esta despesa se repete todo mês." e dois botões — **"Usar este valor nos próximos meses"** (PATCH `{ valor }`) e **"Parar de repetir"** (PATCH `{ ativa: false }`, com `confirm("Parar de lançar esta despesa todo mês? Os meses já lançados continuam.")`). Recorrência inativa: aviso "Esta despesa parou de se repetir."
- [ ] **Step 5:** `npx vitest run && npx tsc --noEmit && npx next lint` → sem erros. Commit `feat: formulario simples para custos e salarios, com repetir todo mes`.

### Task 5: Tela Despesas

**Files:**
- Modify: `src/lib/extrato.ts` (`Movimento` ganha `categoriaSlug: string | null` e `recorrente: boolean`; nome do lançamento sem cliente = `descricao`)
- Create: `src/lib/despesas.ts`
- Test: `src/lib/despesas.test.ts`
- Create: `src/app/despesas/page.tsx`, `src/app/despesas/despesas-content.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/historico/historico-content.tsx` (etiqueta "Recorrente")

**Interfaces:**
- Consumes: `listarMovimentos()`, `gerarDespesasRecorrentes()` (Task 3).
- Produces:
  - `type TipoDespesa = "advogados" | "salarios" | "custos" | "outras"`.
  - `tipoDaDespesa(m: Movimento): TipoDespesa | null` — `null` para entradas e repasses; `audiencia`/`peticao` e slug `ADVOGADO_COLABORADOR`/`AUDIENCIA` → advogados; `SALARIO` → salarios; `CUSTO_OPERACIONAL` → custos; demais saídas → outras.
  - `resumirDespesas(movimentos: Movimento[], mes: string): { total: number; pago: number; falta: number; porTipo: Record<TipoDespesa, { total: number; quantidade: number }>; itens: (Movimento & { tipoDespesa: TipoDespesa })[] }` — só movimentos com `mesDe(m.data) === mes`; `falta` = status diferente de PAGO; valores somados em centavos (`paraCentavos`) para não errar arredondamento.

- [ ] **Step 1: Testes que falham** (`despesas.test.ts`, com um helper `mov(parcial)` que preenche um `Movimento`):
  - audiência, petição e lançamento `ADVOGADO_COLABORADOR` → `advogados`;
  - `SALARIO` → `salarios`; `CUSTO_OPERACIONAL` → `custos`; saída sem slug → `outras`;
  - repasse e entrada → fora (`null` e ausentes de `itens`);
  - movimento de outro mês fora;
  - `0.1 + 0.2` pago e `100` pendente → `total 100.3`, `pago 0.3`, `falta 100`.
- [ ] **Step 2:** Rodar → FAIL; implementar `extrato.ts` + `despesas.ts`; rodar → PASS.
- [ ] **Step 3:** Página `/despesas?mes=AAAA-MM` (padrão: `mesDe(hojeSaoPaulo())`): server component chama `gerarDespesasRecorrentes()` em `try/catch` e depois `listarMovimentos()`; conteúdo client com seletor de mês (‹ mês ›), cartões Total / Pago / Falta pagar, quatro linhas por tipo (Advogados, Salários, Custos operacionais, Outras saídas) que filtram a lista ao tocar, e a lista (nome, categoria, data, valor, status, etiqueta "Recorrente", link `m.link`). Seguir o visual de `historico-content.tsx`. Mês sem despesas: "Nenhuma despesa neste mês."
- [ ] **Step 4:** Menu: item `{ href: "/despesas", label: "Despesas", icon: Wallet }` no lugar de Histórico na barra; Histórico vai para o topo, ao lado do ícone de ajustes (link com ícone `History`, `aria-label="Histórico"`), nas duas larguras de tela.
- [ ] **Step 5:** Histórico mostra a etiqueta "Recorrente" quando `m.recorrente`.
- [ ] **Step 6:** `npx vitest run && npx tsc --noEmit && npx next lint && npx next build` → sem erros. Commit `feat: tela de despesas do mes`.

### Task 6: Publicação e conferência

- [ ] **Step 1:** Atualizar `docs/ARQUITETURA.md` (seção de despesas recorrentes e tela Despesas) e o comentário de `supabase/agendamento-notificacoes.sql` (o disparo das 8h também cria as despesas do mês).
- [ ] **Step 2:** Com aprovação do usuário: push para `main`; o build do Render aplica a migration e o seed.
- [ ] **Step 3:** Conferir no banco (Supabase MCP): tabela `despesas_recorrentes` com RLS ligado, categoria `SALARIO` criada.
- [ ] **Step 4:** Pedir ao usuário para cadastrar um custo recorrente de teste e abrir /despesas; conferir no banco o lançamento e o `ultimo_mes`.
