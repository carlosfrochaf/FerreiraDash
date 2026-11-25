# Marca do escritório — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada cópia do app mostra o nome, o subtítulo, a cor e o logotipo do escritório, lidos da configuração da Vercel.

**Architecture:**
- Uma função pura (`src/lib/marca.ts`) lê os quatro campos e aplica os valores padrão.
- O layout põe a cor em variáveis CSS (`--marca`, `--marca-texto`), que o tema do Tailwind usa no lugar do dourado fixo.
- Ícones e manifest passam a ser gerados pelo próprio Next (`app/icon.tsx`, `app/apple-icon.tsx` e `app/manifest.ts`), na publicação.

**Tech Stack:** Next.js 15 (App Router, `next/og` ImageResponse), Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-25-marca-do-escritorio-design.md`

## Global Constraints
- **Campos:**
  - `NEXT_PUBLIC_ESCRITORIO_NOME`: padrão `Ferreira & Rocha`.
  - `NEXT_PUBLIC_ESCRITORIO_SUBTITULO`: padrão `Financeiro Jurídico`.
  - `NEXT_PUBLIC_ESCRITORIO_COR`: padrão `#D7B340`, que é o dourado atual `hsl(45 60% 54%)`.
  - `ESCRITORIO_LOGO_URL`: padrão `public/icon.png`.
- **Cor fora do formato `#RRGGBB`:** é ignorada e vale a cor padrão.
- **Cor escura:** com luminosidade HSL abaixo de 45%, ela sobe para 55%.
- **Texto sobre a cor:** fica escuro, `hsl(222 47% 7%)`, quando a luminância relativa da cor final for maior que 0,4. Caso contrário, fica branco, `hsl(0 0% 100%)`.
- **Sem nenhum campo configurado,** o app fica idêntico ao de hoje.
- **Sem dependência nova,** porque `sharp` não está no package.json.

## Review Focus
1. **Logo com link quebrado ou fora do ar na publicação:** o build não pode falhar. O ícone usa `public/icon.png`.
2. **Cor sem `#` ou com 3 dígitos (`#fff`):** ignora e usa o padrão. Isso é testado em `corDaMarca`.
3. **Middleware:** o `/icon`, o `/apple-icon` e o `/manifest.webmanifest` precisam abrir sem login, senão o celular não instala o app.
4. **Aviso do celular (`sw.js`):** continua usando `/icon.png`. Fica como está, com o padrão; é aceitável e está registrado.
5. **Nome com `&` ou acento:** aparece certo no título da aba e no manifest. Isso é testado em `marcaDoAmbiente`.

---

### Task 1: Regras da marca (puro)

**Files:**
- Create: `src/lib/marca.ts`, `src/lib/marca.test.ts`

**Interfaces:**
- Produces:
  - `corDaMarca(hex: string | undefined): { cor: string; texto: string }`: strings `hsl(H S% L%)`.
  - `marcaDoAmbiente(env: Record<string, string | undefined>): { nome: string; subtitulo: string; cor: string; texto: string; logoUrl: string | null }`.
  - `MARCA`: o valor calculado de `process.env`.

- [ ] **Step 1: tests**
  ```ts
  expect(corDaMarca(undefined)).toEqual(corDaMarca("#D7B340"));
  expect(corDaMarca("#fff")).toEqual(corDaMarca("#D7B340"));
  expect(corDaMarca("azul")).toEqual(corDaMarca("#D7B340"));
  expect(corDaMarca("#1E3A8A").cor).toMatch(/ 55%\)$/);       // azul-escuro clareado
  expect(corDaMarca("#D7B340").texto).toBe("hsl(222 47% 7%)");
  expect(corDaMarca("#7C3AED").texto).toBe("hsl(0 0% 100%)");
  expect(marcaDoAmbiente({})).toEqual({ nome: "Ferreira & Rocha", subtitulo: "Financeiro Jurídico", ...corDaMarca(undefined), logoUrl: null });
  expect(marcaDoAmbiente({ NEXT_PUBLIC_ESCRITORIO_NOME: "  Silva & Sá Advogados ", ESCRITORIO_LOGO_URL: "https://x/logo.png" }).nome).toBe("Silva & Sá Advogados");
  ```
- [ ] **Step 2:** run `npx vitest run src/lib/marca.test.ts`. **Expected:** FAIL, porque o módulo ainda não existe.
- [ ] **Step 3:** implementar. A conversão vai de hex para HSL e o arredondamento é para inteiros. `MARCA` lê **cada** `process.env.NEXT_PUBLIC_*` por nome literal, porque o Next só embute variáveis escritas assim.
- [ ] **Step 4:** a mesma execução do Step 2 passa.

### Task 2: Cor, nome e subtítulo nas telas

**Files:**
- Modify:
  - `src/app/globals.css`: primary, ring e primary-foreground passam a usar `var(--marca)` e `var(--marca-texto)`. Os valores padrão ficam em `:root`.
  - `src/app/layout.tsx`: põe `style={{ "--marca": MARCA.cor, "--marca-texto": MARCA.texto }}` no `<html>`, e o título e a descrição vêm de `MARCA`.
  - `src/lib/constants.ts`: `APP_NAME = MARCA.nome` e `APP_SUBTITLE = MARCA.subtitulo`.
  - `src/components/layout/app-shell.tsx:50`: troca o texto fixo "Financeiro Jurídico" por `APP_SUBTITLE`.
  - `src/components/forms/recebimento-form.tsx`: a classe `accent-[...]` passa a usar `accent-primary`.

- [ ] **Step 1:** `npx tsc --noEmit && npm run build`. **Expected:** sem erros.
- [ ] **Step 2:** no CSS gerado em `.next/static/css`, a classe de `bg-primary` precisa usar `var(--marca)`. Confirmar com um `grep "var(--marca)"`.

### Task 3: Logotipo como ícone, manifest e login

**Files:**
- Create:
  - `src/app/icon.tsx`: 512×512, usando `ImageResponse` com `<img>` do logo cobrindo tudo.
  - `src/app/apple-icon.tsx`: 180×180.
  - `src/app/manifest.ts`: name e short_name vêm de `MARCA.nome`, description de `MARCA.subtitulo` e theme_color `#0b1220`. Os ícones apontam para `/icon` e `/apple-icon`.
  - `src/lib/marca-logo.ts`: `logoComoDataUrl(): Promise<string>`. Busca `MARCA.logoUrl` com timeout de 10 s; se falhar ou não houver link, lê `public/icon.png` do disco. Devolve um `data:` URL.
- Delete: `public/manifest.json`.
- Modify:
  - `src/app/layout.tsx`: tira de `metadata` as linhas `manifest` e `icons`, porque o Next passa a gerá-las.
  - `src/middleware.ts`: o `matcher` passa a excluir também `icon`, `apple-icon` e `manifest.webmanifest`.
  - `src/app/login/page.tsx`: põe a imagem `/apple-icon`, com 72 px e cantos arredondados, centralizada acima do formulário. O cabeçalho com a balança mostra `APP_SUBTITLE` no lugar de "Acesso restrito" quando não for primeiro acesso.

- [ ] **Step 1:** `npm run build`. **Expected:** build OK e as rotas `/icon`, `/apple-icon` e `/manifest.webmanifest` na lista.
- [ ] **Step 2:** `ESCRITORIO_LOGO_URL=https://invalido.example/x.png npm run build`. **Expected:** build OK, com o ícone de fallback (Review Focus 1).
- [ ] **Step 3:** `npx vitest run`. **Expected:** tudo passa.
- [ ] **Step 4:** commit, só com o ok do usuário.

### Task 4: Conferir no ar
- [ ] Publicar no app de teste, com o ok do usuário. Abrir `/login`, `/manifest.webmanifest` e `/icon` no navegador: o app de teste continua dourado e com o nome "Ferreira & Rocha".
