# Ficha de atendimento, acesso do advogado e PDF — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ficha de atendimento no cliente, advogado responsável com acesso aos clientes dele, arquivo da petição pelo advogado, e documentos sempre em PDF.

**Architecture:** tabela `fichas` com os blocos em `jsonb` validados por zod (`src/lib/ficha.ts`); acesso do advogado por um filtro Prisma puro (`src/lib/acesso-clientes.ts`) usado em páginas e rotas; conversão foto→PDF no navegador com `pdf-lib` (`src/lib/pdf-imagem.ts`).

**Tech Stack:** Next.js 15, Prisma 6 + Postgres, Vitest, pdf-lib 1.17.1 (nova dependência).

**Spec:** `docs/superpowers/specs/2026-11-14-ficha-atendimento-pdf-design.md`

## Global Constraints
- Branch `feat/login-por-pessoa`; só ambiente de teste; nada em `main`.
- Migrações só acrescentam; `ENABLE ROW LEVEL SECURITY` em `fichas`.
- Documentos: servidor aceita só `application/pdf`, até 10 MB (`TAMANHO_MAXIMO` já existente).
- Rótulos e opções da ficha iguais aos do site atual (lista no spec).
- Advogado nunca vê valores nem causas; secretária segue sem valores.

## Review Focus
- Advogado abrindo `/clientes/<id>` de cliente que não é dele (ou GET de documento por id) → 404 (Task 4).
- Advogado tentando apagar documento enviado pela secretária → 403 (Task 4).
- Foto grande (ex.: 4000×3000) ou várias fotos juntas passando de 10 MB depois de virar PDF → aviso antes de enviar, nada enviado (Task 6).
- Ficha salva com campos vazios ou datas em branco → salva como rascunho sem erro (Task 2).
- Petição sem cliente ligado → botão "Enviar arquivo" não aparece, com texto explicando (Task 5).

---

### Task 1: Banco e tipos novos de documento

**Files:** Modify `prisma/schema.prisma`, `src/lib/documentos.ts`, `src/lib/documentos.test.ts`; Create migração `prisma/migrations/20261114000000_fichas/migration.sql` (gerada por `prisma migrate diff`, conferida).

- `enum SituacaoFicha { RASCUNHO ENVIADA }`; `model Ficha` → `fichas`: `id`, `clienteId` (cascade), `advogadoChave String?`, `empresa String?`, `situacao SituacaoFicha @default(RASCUNHO)`, `dados Json @default("{}")`, `recebimentoId String?` (set null), `criadaPorId String?`, `enviadaEm DateTime?`, `createdAt`, `updatedAt`; índices em `clienteId` e `advogadoChave`.
- `Cliente`: `estadoCivil`, `cep`, `cidadeUf`, `origem` (todos `String?`), `fichas Ficha[]`.
- `Documento`: `enviadoPorId String? @map("enviado_por_id")`, `peticaoId String? @map("peticao_id")` com relação a `Peticao` (set null) + índice.
- `TipoDocumento` ganha `TRCT HOLERITE EXTRATO_FGTS CARTAO_PONTO CONTRATO_TRABALHO AVISO_PREVIO ATESTADO CAT PRINTS`; em `documentos.ts` rótulos "TRCT", "Holerite", "Extrato do FGTS", "Cartão de ponto", "Contrato de trabalho", "Aviso prévio", "Atestado / laudo", "CAT", "Prints / mensagens"; ficam em `TIPOS_DA_CAUSA`.
- `arquivoAceito(mime, tamanho)`: só `application/pdf` → senão "Envie em PDF (fotos viram PDF sozinhas).".
- [ ] Teste: `arquivoAceito("image/jpeg", 100)` dá erro; `arquivoAceito("application/pdf", 100)` null; `rotuloTipo("EXTRATO_FGTS")==="Extrato do FGTS"`. FAIL → implementar → PASS.
- [ ] Commit `feat: tabela de fichas e tipos novos de documento`.

### Task 2: Regras da ficha

**Files:** Create `src/lib/ficha.ts`, `src/lib/ficha.test.ts`.

**Produces:**
- `OPCOES_FICHA` (listas fixas: estadoCivil, origem, formaContratacao, motivoDesligamento, avisoPrevio, controlePonto, horasExtrasPagas, epis, verbasRecebidas, teses, documentosChecklist), com os textos do spec.
- `fichaDadosSchema` (zod; tudo opcional; datas `AAAA-MM-DD` ou vazio; valores em texto "1.234,56"; booleanos; `dias: string[]` de "seg".."dom"; `teses: string[]`; `documentos: string[]`): blocos `empresa`, `contrato`, `jornada`, `ambiente`, `verbas`, `relato`, `documentos`, `teses`, `outras`.
- `type FichaDados = z.infer<...>`
- `CHECKLIST_PARA_TIPOS: Record<string, TipoDoc[]>` (ex.: "CTPS"→["CTPS"], "RG E CPF"→["RG_CNH","CPF"], "COMP. RESIDÊNCIA"→["COMPROVANTE_ENDERECO"], "TRCT"→["TRCT"], "HOLERITES"→["HOLERITE"], "EXTRATO FGTS"→["EXTRATO_FGTS"], "CARTÕES DE PONTO"→["CARTAO_PONTO"], "CONTRATO DE TRABALHO"→["CONTRATO_TRABALHO"], "AVISO PRÉVIO"→["AVISO_PREVIO"], "ATESTADOS / LAUDOS"→["ATESTADO"], "CAT"→["CAT"], "PRINTS / MENSAGENS"→["PRINTS"], "COMP. PAGAMENTO"→["COMPROVANTE"]; "ÁUDIOS / VÍDEOS" sem tipo).
- `documentosMarcados(marcadosAMao: string[], tiposEnviados: string[]): { item: string; marcado: boolean; enviado: boolean }[]`
- `podeEnviarFicha(f: { empresa?: string | null; advogadoChave?: string | null }): string | null` → "Informe a empresa." / "Escolha o advogado responsável.".
- [ ] Testes: schema aceita `{}`; recusa `contrato.admissao: "31/12/2026"`; `documentosMarcados([], ["CTPS"])` marca "CTPS" com `enviado:true`; "RG E CPF" fica enviado com só `RG_CNH`; `podeEnviarFicha({empresa:"X"})` pede advogado. FAIL → implementar → PASS.
- [ ] Commit `feat: regras da ficha de atendimento`.

### Task 3: Ficha — rotas e telas

**Files:** Create `src/app/api/fichas/route.ts` (POST `{clienteId}` → cria rascunho), `src/app/api/fichas/[id]/route.ts` (PATCH `{empresa?, advogadoChave?, recebimentoId?, dados?, cliente?: {campos do cadastro}, acao?: "enviar"}`), `src/app/clientes/[id]/fichas/[fichaId]/page.tsx`, `src/components/fichas/ficha-form.tsx`, `src/components/fichas/fichas-do-cliente.tsx`, `src/lib/fichas-servico.ts`; Modify `src/lib/perfis.ts` (+ testes), `src/app/clientes/[id]/page.tsx` + `ficha-cliente.tsx`, `src/lib/clientes-servico.ts`/`validations.ts` (campos novos do cliente).

- Permissões: `/api/fichas` leitura DONO, FINANCEIRO, SECRETARIA, ADVOGADO; escrita DONO, SECRETARIA, ADVOGADO. Tela `/clientes/*/fichas/*` igual. Teste em `perfis.test.ts`: `podeUsarApi("FINANCEIRO","PATCH","/api/fichas/x")===false`, `podeUsarApi("ADVOGADO","PATCH","/api/fichas/x")===true`.
- PATCH: valida `dados` com `fichaDadosSchema`; campos do cliente salvos no cadastro (mesmas regras do `clienteSchema`, parcial); `acao:"enviar"` usa `podeEnviarFicha`, grava `ENVIADA`, `enviadaEm`, e manda push aos aparelhos dos usuários ADVOGADO ativos com aquele `advogadoChave`: título "Nova ficha para você", corpo "Cliente × Empresa", url da ficha, tag "ficha".
- Advogado só edita ficha em que é o responsável (senão 403).
- Telas: na ficha do cliente, bloco "Fichas de atendimento" (lista + "Nova ficha"); página da ficha com os blocos recolhíveis, botão "Salvar" e "Enviar ao advogado"; bloco Documentos da ficha usa `documentosMarcados` com os tipos já enviados do cliente.
- `TAGS_DO_PERFIL.ADVOGADO` não muda (aviso de ficha é enviado direto, fora do turno).
- [ ] Testes perfis → FAIL → implementar → PASS; `tsc`, build OK.
- [ ] Commit `feat: ficha de atendimento no cliente`.

### Task 4: Advogado vê os clientes dele

**Files:** Create `src/lib/acesso-clientes.ts` + teste; Modify `src/lib/perfis.ts` (+ testes), `src/components/layout/menu.ts`, `src/app/clientes/page.tsx`, `src/app/clientes/[id]/page.tsx`, `ficha-cliente.tsx`, `src/app/api/documentos/route.ts`, `src/app/api/documentos/[id]/route.ts`, `src/app/api/clientes/**` (GET).

**Produces:** `filtroClientesDoUsuario(u): Prisma.ClienteWhereInput` (ADVOGADO: `OR` de fichas com `advogadoChave`, audiências e petições com `advogadoNome` igual sem maiúsculas; ADVOGADO sem chave → nada; outros `{}`); `podeApagarDocumento(u: {id, perfil}, doc: {enviadoPorId: string|null}): boolean` (ADVOGADO só se `enviadoPorId === u.id`; FINANCEIRO nunca; DONO/SECRETARIA sempre).
- Perfis: ADVOGADO vê `/clientes` e `/clientes/<id>` (não `/clientes/novo`); API `clientes` GET e `documentos` GET/POST/PATCH/DELETE abertas ao ADVOGADO (a rota confere o cliente). Barra do advogado: `["/", "/clientes", "/peticoes", "/meus-pagamentos"]`; Audiências vai para o "Mais".
- Cliente fora do filtro → `notFound()` na página e 404 na API (inclusive GET/PATCH/DELETE de documento pelo id, conferindo o cliente do documento).
- Ficha do cliente para ADVOGADO: sem causas e sem valores; sem editar cadastro; documentos com enviar; apagar/renomear só os dele. POST de documento grava `enviadoPorId`.
- [ ] Testes: `podeApagarDocumento` (advogado próprio true, alheio false, financeiro false, secretária true); filtro do advogado sem chave não é `{}`; perfis do advogado. FAIL → implementar → PASS; build.
- [ ] Commit `feat: advogado ve os clientes dele`.

### Task 5: Arquivo da petição

**Files:** Modify `src/lib/peticoes.ts` (serializar `clienteId` e `arquivos: {id, nome}[]` dos documentos ligados), `src/components/peticoes/peticao-ui.tsx`, `src/app/api/documentos/route.ts` (aceita `peticaoId`: confere que a petição é do cliente e, para ADVOGADO, que é dele; tipo fica `PETICAO`).
- No item/modal da petição: para quem pode (DONO, SECRETARIA e o ADVOGADO dono), "Enviar arquivo (PDF)" e a lista "arquivo enviado" com abrir. Sem `clienteId`: texto "Ligue esta petição a um cliente para anexar o arquivo.".
- [ ] `tsc`, build OK. Commit `feat: advogado envia o arquivo da peticao`.

### Task 6: Foto vira PDF

**Files:** `npm install pdf-lib@1.17.1`; Create `src/lib/pdf-imagem.ts`, `src/lib/pdf-imagem.test.ts`; Modify `src/components/documentos/documentos-cliente.tsx`, upload da Task 5.

**Produces:** `escalaParaPdf(largura: number, altura: number, max = 2000): { largura: number; altura: number }` (puro; mantém proporção; não aumenta); `ehImagem(mime: string): boolean`; `paraPdf(arquivos: File[], juntar: boolean): Promise<File[]>` (navegador: PDFs passam direto; imagens → canvas reduzido → JPEG 0,82 → página A4 do pdf-lib com a imagem centralizada; `juntar` = um PDF com uma página por foto, nome do primeiro arquivo + ".pdf"; imagem que não abre → erro "Não foi possível abrir <nome>.").
- Upload: converte antes de enviar; mostra "Convertendo para PDF…"; confere `arquivoAceito` no PDF resultante (10 MB) e avisa sem enviar; caixa "Juntar em um PDF só" aparece quando há 2+ fotos.
- [ ] Testes: `escalaParaPdf(4000,3000)` → `{2000,1500}`; `escalaParaPdf(800,600)` → igual; `escalaParaPdf(1000,3000)` → `{667,2000}` (arredondado); `ehImagem("image/heic")` true, `ehImagem("application/pdf")` false. FAIL → implementar → PASS.
- [ ] Commit `feat: fotos viram PDF no envio`.

### Task 7: Conferir e publicar no teste
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx next lint`, `npx next build` (limpar `.next`) → OK.
- [ ] Revisão final, pedir aprovação, push; conferir no ar (rotas respondem 401/307 sem login).
