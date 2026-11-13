# Login por pessoa e perfis — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar a senha única por login com e-mail/senha por pessoa, com 4 perfis fixos que decidem telas, ações, dados e avisos.

**Architecture:** regras puras em `src/lib/perfis.ts` usadas pelo middleware, pelo menu e pelas rotas; senha com PBKDF2 e cookie assinado (HMAC) via Web Crypto, conferido no middleware sem banco; o servidor confere `ativo` e `versaoSessao` no banco a cada página/rota.

**Tech Stack:** Next.js 15 App Router, Prisma 6 + Postgres (Supabase), Vitest, Web Crypto.

**Spec:** `docs/superpowers/specs/2026-11-13-login-por-pessoa-design.md`

## Global Constraints
- Branch `feat/login-por-pessoa` (base `feat/clientes-documentos`); vai só para o ambiente de teste. Nada disso entra em `main`.
- Perfis: `DONO`, `FINANCEIRO`, `SECRETARIA`, `ADVOGADO` (rótulos: "Dono/Sócio", "Financeiro", "Secretária", "Advogado").
- Senha: mínimo 8 caracteres; PBKDF2-SHA256, 210000 iterações, sal de 16 bytes; formato guardado `pbkdf2$210000$<salHex>$<hashHex>`.
- Cookie `fd_sessao`, httpOnly, sameSite lax, 90 dias; segredo `SESSION_SECRET` (env). Sem `APP_PASSWORD` neste branch.
- E-mail sempre `trim().toLowerCase()`.
- Migrações só acrescentam, com `ENABLE ROW LEVEL SECURITY` em tabela nova. Exceção prevista: apagar `push_subscriptions` antigas (teste sem uso).
- Textos em português, padrão visual atual.

## Review Focus
- Último Dono tentando se desativar ou mudar o próprio perfil → bloqueado com mensagem (Task 6).
- Usuário desativado ou com senha trocada usando cookie antigo → mandado ao login (Task 5).
- Advogado abrindo `/audiencias/<id>` de outro advogado (ou PATCH pela API) → 404 (Task 7).
- Secretária mandando `valor` pela API de audiências/petições → valor ignorado, nunca devolvido (Task 7).
- E-mail com maiúsculas/espaços no login ou cadastro → trata como o mesmo e-mail; e-mail repetido no cadastro → erro claro (Tasks 4 e 6).

---

### Task 1: Regras de acesso por perfil

**Files:** Create `src/lib/perfis.ts`, `src/lib/perfis.test.ts`; Modify `src/components/layout/menu.ts`

**Interfaces — Produces:**
- `type Perfil = "DONO" | "FINANCEIRO" | "SECRETARIA" | "ADVOGADO"`; `PERFIS: Perfil[]`; `rotuloPerfil(p): string`
- `podeVerTela(perfil: Perfil, pathname: string): boolean`
- `podeUsarApi(perfil: Perfil, metodo: string, pathname: string): boolean`
- `veValores(perfil): boolean` (false só para SECRETARIA); `editaClientes(perfil)` (DONO, SECRETARIA); `soDoAdvogado(perfil)` (ADVOGADO)
- em `menu.ts`: `ItemMenu` ganha `perfis: Perfil[]`; `secoesDoPerfil(perfil): SecaoMenu[]`; `barraDoPerfil(perfil): string[]`

Tabela de telas (prefixos): `/` todos · `/clientes` DONO, FINANCEIRO, SECRETARIA · `/clientes/novo` DONO, SECRETARIA · `/lancamentos`, `/despesas`, `/historico`, `/recebimentos`, `/categorias` DONO, FINANCEIRO · `/audiencias`, `/peticoes` todos · `/audiencias/nova`, `/peticoes/nova` DONO, FINANCEIRO, SECRETARIA · `/meus-pagamentos` ADVOGADO · `/usuarios` DONO. Rota não listada → só DONO.
API: GET segue a tela do mesmo recurso; escrita: `clientes`, `documentos` DONO+SECRETARIA; `transacoes`, `recebimentos`, `parcelas`, `recorrencias`, `categorias` DONO+FINANCEIRO; `audiencias`, `peticoes` DONO+FINANCEIRO+SECRETARIA; `usuarios` DONO; `push/subscribe`, `login*` todos; `admin/*` DONO.
Barra do celular: DONO/FINANCEIRO `["/", "/clientes", "/lancamentos/novo", "/recebimentos"]`; SECRETARIA `["/", "/clientes", "/audiencias", "/peticoes"]`; ADVOGADO `["/", "/audiencias", "/peticoes", "/meus-pagamentos"]`. Menu ganha itens "Meus pagamentos" (Advogados) e "Usuários" (Ajustes).

- [ ] Step 1: testes `perfis.test.ts`: `podeVerTela("SECRETARIA","/despesas")===false`; `podeVerTela("SECRETARIA","/clientes/abc")===true`; `podeVerTela("FINANCEIRO","/clientes/novo")===false`; `podeVerTela("ADVOGADO","/meus-pagamentos")===true`; `podeVerTela("FINANCEIRO","/usuarios")===false`; `podeVerTela("DONO","/qualquer")===true`; `podeUsarApi("FINANCEIRO","POST","/api/documentos")===false`; `podeUsarApi("FINANCEIRO","GET","/api/documentos/x")===true`; `podeUsarApi("ADVOGADO","PATCH","/api/audiencias/x")===false`; `podeUsarApi("SECRETARIA","POST","/api/transacoes")===false`; `secoesDoPerfil("ADVOGADO")` não contém `/despesas` e contém `/meus-pagamentos`.
- [ ] Step 2: `npx vitest run src/lib/perfis.test.ts` → FAIL.
- [ ] Step 3: implementar (regra pelo prefixo mais longo que casar).
- [ ] Step 4: vitest → PASS.
- [ ] Step 5: commit `feat: regras de acesso por perfil`.

### Task 2: Senha e sessão

**Files:** Create `src/lib/senha.ts`, `src/lib/sessao.ts`, testes ao lado; Delete conteúdo de senha única de `src/lib/auth.ts` (fica só `AUTH_COOKIE`, `AUTH_MAX_AGE`).

**Interfaces — Produces:**
- `hashSenha(senha: string): Promise<string>`; `conferirSenha(senha: string, guardado: string): Promise<boolean>` (tempo constante)
- `type Sessao = { id: string; perfil: Perfil; versao: number; expira: number }`
- `assinarSessao(s: Omit<Sessao,"expira">, segredo: string, agoraMs?: number): Promise<string>` → `id.perfil.versao.expira.assinaturaHex`
- `lerSessao(token: string | undefined, segredo: string, agoraMs?: number): Promise<Sessao | null>`
- `segredoSessao(): string | undefined` (lê `SESSION_SECRET`)

- [ ] Step 1: testes: hash começa com `pbkdf2$210000$`; `conferirSenha` certa → true, errada → false; dois hashes da mesma senha diferem; `lerSessao(assinarSessao(...))` devolve os mesmos dados; token com perfil trocado → null; outro segredo → null; `agoraMs` 91 dias depois → null; perfil inexistente → null.
- [ ] Step 2: vitest → FAIL. Step 3: implementar. Step 4: vitest → PASS.
- [ ] Step 5: commit `feat: senha com hash e sessao assinada`.

### Task 3: Banco

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20261113000000_usuarios/migration.sql` (gerar com `npx prisma migrate diff --from-schema-datamodel <schema antigo> --to-schema-datamodel prisma/schema.prisma --script`, conferir que só acrescenta).

- `enum Perfil { DONO FINANCEIRO SECRETARIA ADVOGADO }`
- `model Usuario` → tabela `usuarios`: `id` cuid, `nome`, `email @unique`, `senhaHash @map("senha_hash")`, `perfil Perfil`, `advogadoChave String? @map("advogado_chave")`, `ativo Boolean @default(true)`, `versaoSessao Int @default(1) @map("versao_sessao")`, `createdAt`, `updatedAt`, `aparelhos PushSubscription[]`.
- `PushSubscription` ganha `usuarioId String @map("usuario_id")` + relação `onDelete: Cascade` + índice. No SQL, antes do `ADD COLUMN ... NOT NULL`: `DELETE FROM "push_subscriptions";`.
- `ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;`

- [ ] Step 1: editar schema, gerar migração, `npx prisma generate`, `npx tsc --noEmit` (erros esperados só em `push/subscribe`, resolvidos na Task 9 — se travar o build, setar `usuarioId` lá já nesta task a partir da sessão).
- [ ] Step 2: commit `feat: tabela de usuarios e aparelhos por usuario`.

### Task 4: Login e primeiro acesso

**Files:** Modify `src/app/api/login/route.ts`, `src/app/login/page.tsx`; Create `src/app/api/login/primeiro-acesso/route.ts`, `src/lib/usuarios.ts`; Modify `src/lib/validations.ts`.

**Interfaces — Produces:** em `usuarios.ts`: `normalizarEmail(e: string): string`; `existeUsuario(): Promise<boolean>`; `cookieDeSessao(res: NextResponse, u: {id, perfil, versaoSessao}): Promise<void>`. Schemas `loginSchema {email, senha}`, `usuarioNovoSchema {nome, email, senha(min 8), perfil, advogadoChave?}`.

- `POST /api/login` {email, senha}: usuário ativo + senha certa → cookie; senão espera 1s e 401 "E-mail ou senha incorretos.". `DELETE` mantém.
- `GET /api/login/primeiro-acesso` → `{ liberado: !existeUsuario() }`; `POST` só se não houver usuário: cria DONO, já entra. Com usuário existente → 403.
- Página de login: campos e-mail e senha; se `liberado`, mostra o formulário "Criar primeiro acesso" (nome, e-mail, senha, confirmar senha).
- Testes: `normalizarEmail("  Ana@X.com ")==="ana@x.com"`; `usuarioNovoSchema` rejeita senha de 7 caracteres e aceita 8.
- [ ] Steps: teste → FAIL → implementar → PASS → commit `feat: login por e-mail e primeiro acesso`.

### Task 5: Trava em todas as telas e rotas

**Files:** Modify `src/middleware.ts`, `src/app/layout.tsx`, `src/components/layout/app-shell.tsx`; Create `src/lib/usuario-atual.ts`.

**Interfaces — Produces:** `usuarioAtual(): Promise<UsuarioLogado>` (server; lê cookie por `cookies()`, carrega do banco, exige `ativo` e `versaoSessao === sessao.versao`, senão `redirect("/login")`); `type UsuarioLogado = { id, nome, perfil: Perfil, advogadoChave: string | null }`; `exigirPerfilApi(req, perfis?: Perfil[]): Promise<UsuarioLogado | NextResponse>` para rotas (401/403 em JSON).

- Middleware: rotas públicas `/login`, `/api/login`, `/api/login/primeiro-acesso`, `/api/push/send-notifications`. Sem sessão válida → `/login` (API: 401). Tela proibida → redirect `/`. API proibida → 403 `{error:"Sem permissão."}`. Sem `SESSION_SECRET` em produção → 503.
- Layout: carrega `usuarioAtual()` (exceto em `/login`) e passa `{nome, perfil}` ao `AppShell`; menu e barra usam `secoesDoPerfil`/`barraDoPerfil`; cabeçalho mostra o nome e o perfil.
- Toda rota em `src/app/api/**` (menos as públicas) chama `exigirPerfilApi` no começo (garante usuário ativo/versão).
- [ ] Step 1: `npx tsc --noEmit`, `npx next build` OK. Step 2: commit `feat: trava de acesso por perfil em telas e rotas`.

### Task 6: Tela de usuários

**Files:** Create `src/app/usuarios/page.tsx`, `src/app/usuarios/usuarios-content.tsx`, `src/app/api/usuarios/route.ts` (GET, POST), `src/app/api/usuarios/[id]/route.ts` (PATCH); Modify `src/lib/usuarios.ts`, `src/lib/validations.ts`.

**Interfaces — Produces:** `mudancaPermitida(usuarios: {id, perfil, ativo}[], alvoId, mudanca: {perfil?, ativo?}): string | null` — devolve erro "Precisa ficar pelo menos um Dono/Sócio ativo." se a mudança deixar zero DONO ativo.

- Lista: nome, e-mail, perfil, advogado ligado, ativo. Criar (nome, e-mail, senha, perfil; se ADVOGADO, escolher o advogado da lista de `advogados` ou nomes já usados em audiências/petições). Editar perfil/advogado/ativo. "Definir senha nova" (min 8). Desativar, trocar perfil ou senha → `versaoSessao + 1`.
- E-mail repetido → 409 "Já existe um usuário com esse e-mail.".
- Testes de `mudancaPermitida`: desativar o único DONO → erro; mudar perfil do único DONO → erro; com 2 DONOs → null.
- [ ] Steps: teste → FAIL → implementar → PASS → commit `feat: tela de usuarios`.

### Task 7: Advogado só vê o dele; secretária sem valores; meus pagamentos

**Files:** Modify `src/lib/audiencias.ts`, `src/lib/peticoes.ts`, páginas `src/app/audiencias/**`, `src/app/peticoes/**`, rotas `src/app/api/audiencias/**`, `src/app/api/peticoes/**`, ficha do cliente (esconde valores das causas se `!veValores`); Create `src/app/meus-pagamentos/page.tsx`, `src/lib/meus-pagamentos.ts` + teste.

**Interfaces — Produces:** `filtroDoUsuario(u: UsuarioLogado): { advogadoNome?: { equals: string; mode: "insensitive" } } | {}` — para ADVOGADO sem `advogadoChave` devolve filtro que não casa nada; `semValores<T extends { valor?: unknown }>(item: T, perfil): T` (zera `valor`/`advogadoPix` se `!veValores`); `resumoPagamentos(itens: {valor: number|null, pago: boolean, data: string}[]): { recebido: number; aReceber: number; semValor: number }`.

- Advogado: listas e telas de detalhe com o filtro; id de outro advogado → `notFound()`/404; não vê botões de editar/pagar.
- Secretária: listas sem coluna de valor; criar/editar ignora `valor`, `statusPagamento`, `dataPagamento` enviados.
- `/meus-pagamentos`: totais recebido/a receber e lista das audiências e petições dele.
- Testes: `resumoPagamentos` com 2 pagos (100, 50), 1 a pagar (80), 1 sem valor → `{recebido:150, aReceber:80, semValor:1}`; `filtroDoUsuario` de ADVOGADO sem chave não é `{}`; `semValores` com SECRETARIA zera valor.
- [ ] Steps: teste → FAIL → implementar → PASS → build → commit `feat: advogado ve so o dele e secretaria sem valores`.

### Task 8: Início por perfil

**Files:** Modify `src/app/page.tsx`; Create `src/components/dashboard/hoje.tsx`.

- DONO/FINANCEIRO: Início atual.
- SECRETARIA: "Hoje" = audiências de hoje e amanhã (com WhatsApp do cliente se houver telefone), petições a fazer, clientes com documentos faltando (até 5, link "ver todos").
- ADVOGADO: "Hoje" com só as audiências/petições dele + card com o resumo de `resumoPagamentos`.
- [ ] Step 1: build OK. Step 2: commit `feat: inicio de cada perfil`.

### Task 9: Avisos por perfil

**Files:** Modify `src/app/api/push/subscribe/route.ts` (grava `usuarioId` da sessão), `src/app/api/push/send-notifications/route.ts`, `src/lib/notificacoes.ts` + teste.

**Interfaces — Produces:** `TAGS_DO_PERFIL: Record<Perfil, string[] | "todas">` — DONO "todas"; FINANCEIRO `vencem-hoje, repasses, peticoes, lancamentos-hoje, advogados-semana, pagamentos-amanha, atrasadas`; SECRETARIA `audiencias-hoje, audiencias-amanha, peticoes`; ADVOGADO `audiencias-hoje, audiencias-amanha`. `avisosDoPerfil(perfil, notificacoes): Notificacao[]`; `dadosDoAdvogado(d: DadosDoDia, chave: string): DadosDoDia` (só audiências dele, demais listas vazias).
- Envio: para cada aparelho, pega o usuário (ativo); ADVOGADO → `montarNotificacoes(turno, dadosDoAdvogado(dados, chave))` e filtra; outros → filtra as gerais. Usuário inativo → não envia. `teste` continua indo para todos.
- Testes: SECRETARIA não recebe tag `vencem-hoje`; FINANCEIRO não recebe `audiencias-hoje`; `dadosDoAdvogado` remove audiência de outro advogado e zera `vencemHoje`.
- [ ] Steps: teste → FAIL → implementar → PASS → commit `feat: avisos de cada perfil`.

### Task 10: Publicar no teste

- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx next lint`, `npx next build` (limpar `.next` antes) → tudo OK.
- [ ] Pedir ao usuário: no Render `ferreiradash-teste` → Environment → `SESSION_SECRET` com o botão **Generate**; Settings → Branch `feat/login-por-pessoa`.
- [ ] Pedir aprovação, push, conferir o deploy; usuário cria o primeiro acesso e testa cada perfil criando um usuário de cada.
