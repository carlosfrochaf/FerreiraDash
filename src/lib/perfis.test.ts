import { describe, expect, it } from "vitest";
import { podeUsarApi, podeVerTela, veValores } from "./perfis";
import { barraDoPerfil, secoesDoPerfil } from "@/components/layout/menu";

describe("podeVerTela", () => {
  it("secretária não vê despesas, vê ficha do cliente", () => {
    expect(podeVerTela("SECRETARIA", "/despesas")).toBe(false);
    expect(podeVerTela("SECRETARIA", "/clientes/abc")).toBe(true);
  });
  it("financeiro não cria cliente nem vê usuários", () => {
    expect(podeVerTela("FINANCEIRO", "/clientes/novo")).toBe(false);
    expect(podeVerTela("FINANCEIRO", "/usuarios")).toBe(false);
    expect(podeVerTela("FINANCEIRO", "/clientes")).toBe(true);
  });
  it("advogado vê meus pagamentos e não vê clientes", () => {
    expect(podeVerTela("ADVOGADO", "/meus-pagamentos")).toBe(true);
    expect(podeVerTela("ADVOGADO", "/clientes")).toBe(false);
    expect(podeVerTela("ADVOGADO", "/audiencias/nova")).toBe(false);
    expect(podeVerTela("ADVOGADO", "/audiencias/x/editar")).toBe(false);
    expect(podeVerTela("ADVOGADO", "/audiencias")).toBe(true);
  });
  it("rota não listada só para o dono", () => {
    expect(podeVerTela("DONO", "/qualquer")).toBe(true);
    expect(podeVerTela("FINANCEIRO", "/qualquer")).toBe(false);
  });
});

describe("podeUsarApi", () => {
  it("financeiro lê documentos mas não envia", () => {
    expect(podeUsarApi("FINANCEIRO", "POST", "/api/documentos")).toBe(false);
    expect(podeUsarApi("FINANCEIRO", "GET", "/api/documentos/x")).toBe(true);
  });
  it("advogado não edita audiência; secretária não lança", () => {
    expect(podeUsarApi("ADVOGADO", "PATCH", "/api/audiencias/x")).toBe(false);
    expect(podeUsarApi("SECRETARIA", "POST", "/api/transacoes")).toBe(false);
    expect(podeUsarApi("SECRETARIA", "POST", "/api/audiencias")).toBe(true);
  });
  it("usuários só para o dono; aparelho para todos", () => {
    expect(podeUsarApi("FINANCEIRO", "GET", "/api/usuarios")).toBe(false);
    expect(podeUsarApi("ADVOGADO", "POST", "/api/push/subscribe")).toBe(true);
  });
});

describe("menu por perfil", () => {
  const hrefs = (p: Parameters<typeof secoesDoPerfil>[0]) => secoesDoPerfil(p).flatMap((s) => s.itens.map((i) => i.href));
  it("advogado sem despesas, com meus pagamentos", () => {
    expect(hrefs("ADVOGADO")).not.toContain("/despesas");
    expect(hrefs("ADVOGADO")).toContain("/meus-pagamentos");
    expect(barraDoPerfil("ADVOGADO")).toEqual(["/", "/audiencias", "/peticoes", "/meus-pagamentos"]);
  });
  it("dono vê usuários; secretária não", () => {
    expect(hrefs("DONO")).toContain("/usuarios");
    expect(hrefs("SECRETARIA")).not.toContain("/usuarios");
    expect(veValores("SECRETARIA")).toBe(false);
    expect(veValores("FINANCEIRO")).toBe(true);
  });
});
