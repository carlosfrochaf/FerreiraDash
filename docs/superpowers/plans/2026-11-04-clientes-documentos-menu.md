# Clientes, documentos e menu lateral — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastro de clientes ligado a causas/audiências/petições, documentos por cliente e causa (Supabase Storage privado) e menu por setores.

**Architecture:** Tabelas novas `clientes` e `documentos` + `cliente_id` opcional nas três tabelas; regras puras em `src/lib/clientes.ts` e `src/lib/documentos.ts`; Storage acessado pela API REST do Supabase com a chave de serviço (sem dependência nova); menu num componente único usado por `AppShell`.

**Tech Stack:** Next.js 15, Prisma/PostgreSQL (Supabase), Supabase Storage REST, Zod, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-04-clientes-documentos-menu-design.md`

## Global Constraints

- Branch `feat/clientes-documentos`; nada na `main` sem aprovação.
- Migrations só acrescentam (tabelas novas, colunas opcionais); `ENABLE ROW LEVEL SECURITY` nas tabelas novas.
- Bucket `documentos` privado; arquivo ≤ 10 MB; tipos aceitos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`.
- Link de arquivo: assinado, 300 s.
- Datas `AAAA-MM-DD` (`dataParaDb`/`dataDoDb`); textos em português.
- Checagens por tarefa: `npx vitest run`, `npx tsc --noEmit`, `npx next lint` (erros antigos de outros arquivos não contam), `npx next build` nas tarefas de tela.

## Review Focus

- Salvar causa/audiência/petição com nome que já existe com acento ou maiúscula diferente → liga ao cliente existente, não cria duplicado (Task 2).
- Juntar clientes move causas, audiências, petições **e documentos** antes de apagar o duplicado (Task 2, transação).
- Apagar documento remove o arquivo do Storage e a linha; se o Storage falhar, a linha fica (Task 3).
- Sem `SUPABASE_SERVICE_ROLE_KEY` configurada: a área de documentos mostra "Documentos ainda não configurados" em vez de quebrar a ficha (Task 3).
- Menu no celular: "Mais" abre e fecha sem cobrir a barra de baixo; item ativo destacado nos dois menus (Task 4).

---

### Task 1: Banco e regras puras de clientes

**Files:** `prisma/schema.prisma`, `prisma/migrations/20261104000000_clientes_documentos/migration.sql`, `src/lib/clientes.ts`, `src/lib/clientes.test.ts`

**Interfaces — Produces:**
- `Cliente { id, nome, cpf?, telefone?, email?, endereco?, dataNascimento? (@db.Date), pix?, observacoes?, createdAt, updatedAt }` → `clientes`; relações `recebimentos`, `audiencias`, `peticoes`, `documentos`.
- `Recebimento.clienteId?`, `Audiencia.clienteId?`, `Peticao.clienteId?` (FK `ON DELETE SET NULL`, índice).
- `enum TipoDocumento { RG_CNH CPF COMPROVANTE_ENDERECO CTPS PROCURACAO CONTRATO_HONORARIOS PETICAO DECISAO ACORDO_ATA ALVARA COMPROVANTE OUTRO }`; `Documento { id, clienteId, recebimentoId?, tipo, nome, caminho, mime, tamanho Int, createdAt }` → `documentos` (cliente `ON DELETE CASCADE`, causa `SET NULL`).
- `chaveCliente(nome: string): string` (sem acento, minúsculas, espaços únicos); `mascararCpf(cpf: string): string`; `cpfValido(cpf: string): boolean` (reaproveitar a lógica de `src/lib/pix.ts`, exportando-a); `linkWhatsApp(telefone: string): string | null` (`https://wa.me/55DDDNUMERO`).

- [ ] Testes que falham: `chaveCliente(" Edvânia  CRISTINA ")` = `chaveCliente("edvania cristina")`; `mascararCpf("529.982.247-25")` → `"***.982.247-**"`; `cpfValido("52998224725")` true, `"11111111111"` false; `linkWhatsApp("(31) 98765-4321")` → `"https://wa.me/5531987654321"`, `linkWhatsApp("123")` → null.
- [ ] Schema + SQL (conferir com `prisma migrate diff`), implementar funções, testes PASS. Commit.

### Task 2: Serviço, API e telas de clientes; carga inicial

**Files:** `src/lib/clientes-servico.ts`, `src/app/api/clientes/route.ts`, `src/app/api/clientes/[id]/route.ts`, `src/app/api/clientes/[id]/juntar/route.ts`, `src/app/clientes/page.tsx`, `src/app/clientes/[id]/page.tsx`, `src/app/clientes/novo/page.tsx`, `src/components/clientes/*`; modificar `src/lib/recebimentos.ts`, `src/lib/audiencias.ts`, `src/lib/peticoes.ts`, formulários de causa/audiência/petição; `src/lib/validations.ts` (`clienteSchema`).

**Interfaces — Produces:**
- `garantirCliente(tx, nome: string, extras?: { pix?: string | null }): Promise<string>` — acha por `chaveCliente` ou cria; retorna id. Chamado ao criar/editar causa, audiência e petição (o nome digitado continua salvo).
- `juntarClientes(destinoId, origemId)` — numa transação move `recebimentos/audiencias/peticoes/documentos` e apaga a origem; completa campos vazios do destino com os da origem.
- `carregarClientesIniciais(): Promise<number>` — cria clientes a partir dos nomes existentes (uma vez, idempotente) e preenche `cliente_id`; Pix da causa mais recente.

- [ ] Teste puro: agrupamento da carga inicial (`agruparNomes(nomes: string[]): { chave, nome }[]`, nome mais frequente/maiúsculo preservado) com casos de acento e espaço.
- [ ] Lista (busca por nome/CPF/telefone, nº de causas, selo "Faltam documentos"), ficha (editar dados, WhatsApp, causas com `resumoCausa`, audiências, petições, documentos da Task 3), novo cliente, juntar (seleciona outro cliente, confirmação).
- [ ] Campo "Cliente" nos três formulários com sugestões (`datalist`) dos clientes; Pix da causa vazio → usa o do cliente.
- [ ] Rota `POST /api/clientes/carga-inicial` (protegida pelo login) chamada uma vez no deploy pelo seed (`prisma/seed.ts` chama `carregarClientesIniciais`).
- [ ] Checagens + build. Commit.

### Task 3: Documentos

**Files:** `src/lib/storage.ts`, `src/lib/documentos.ts`, `src/lib/documentos.test.ts`, `src/app/api/documentos/route.ts` (POST multipart), `src/app/api/documentos/[id]/route.ts` (GET → redireciona para link assinado; PATCH nome/tipo/causa; DELETE), `src/components/documentos/*`; ficha do cliente e tela de edição da causa.

**Interfaces — Produces:**
- `storage.enviar(caminho, arquivo: Blob, mime)`, `storage.linkAssinado(caminho, segundos = 300)`, `storage.apagar(caminho)`, `storage.configurado(): boolean` — `fetch` em `${SUPABASE_URL}/storage/v1/...` com `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`; cria o bucket `documentos` (privado) se não existir no primeiro envio.
- `TIPOS_PESSOAIS`, `TIPOS_DA_CAUSA`, `rotuloTipo(tipo)`, `documentosFaltando(docs: {tipo, recebimentoId}[], causas: {id}[]): { pessoais: TipoDocumento[]; porCausa: Record<string, TipoDocumento[]> }` (pessoais: RG_CNH, CPF, COMPROVANTE_ENDERECO; por causa: PROCURACAO, CONTRATO_HONORARIOS); `arquivoAceito(mime, tamanho): string | null` (mensagem de erro ou null).

- [ ] Testes que falham: faltando com cliente sem nada → 3 pessoais + 2 por causa; com RG e procuração da causa A → falta CPF, comprovante; causa A falta só contrato; `arquivoAceito("application/zip", 10)` → "Tipo de arquivo não aceito."; `arquivoAceito("application/pdf", 11*1024*1024)` → "Arquivo maior que 10 MB.".
- [ ] Envio de vários arquivos (tipo e causa por arquivo), lista por bloco (Pessoais / cada causa), ver/baixar, renomear, apagar com confirmação; aviso "Falta: …".
- [ ] Sem chave configurada: mensagem e botão de envio desativado.
- [ ] Checagens + build. Commit.

### Task 4: Menu lateral

**Files:** `src/components/layout/menu.ts` (estrutura), `src/components/layout/app-shell.tsx`, `src/components/layout/menu-mais.tsx`

**Interfaces — Produces:** `SECOES: { titulo?: string; itens: { href, label, icon, tambem?: string }[] }[]` conforme o spec; `BARRA_CELULAR` = Início, Clientes, Lançar, Recebimentos + "Mais".

- [ ] Computador (≥ md): coluna fixa à esquerda (largura ~ 220 px) com as seções; conteúdo à direita; topo mantém sino, sair.
- [ ] Celular: barra de 5 itens; "Mais" abre painel de baixo para cima com o restante; fecha ao escolher ou tocar fora.
- [ ] Checagens + build. Commit.

### Task 5: Ambiente de teste e publicação

- [ ] Push do branch; usuário troca o branch do `ferreiradash-teste` no Render e cola `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (do projeto de teste).
- [ ] Conferir no teste: carga inicial (dados de exemplo viram 3 clientes), envio/abertura/remoção de documento, menu no celular e no computador.
- [ ] Revisão final do branch (revisor separado), correções.
- [ ] Com aprovação: merge na `main`, chaves do Supabase do escritório no Render, conferir a carga dos ~50 clientes reais.
