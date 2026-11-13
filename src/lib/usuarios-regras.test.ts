import { describe, expect, it } from "vitest";
import { normalizarEmail } from "./usuarios-regras";
import { usuarioNovoSchema } from "./validations";

describe("usuários", () => {
  it("e-mail sem espaço e minúsculo", () => {
    expect(normalizarEmail("  Ana@X.com ")).toBe("ana@x.com");
  });
  it("senha precisa de 8 caracteres", () => {
    const base = { nome: "Ana", email: "ana@x.com", perfil: "SECRETARIA" };
    expect(usuarioNovoSchema.safeParse({ ...base, senha: "1234567" }).success).toBe(false);
    expect(usuarioNovoSchema.safeParse({ ...base, senha: "12345678" }).success).toBe(true);
  });
  it("e-mail inválido e perfil inexistente falham", () => {
    expect(usuarioNovoSchema.safeParse({ nome: "A", email: "x", senha: "12345678", perfil: "DONO" }).success).toBe(false);
    expect(usuarioNovoSchema.safeParse({ nome: "A", email: "a@b.co", senha: "12345678", perfil: "CHEFE" }).success).toBe(false);
  });
});

import { mudancaPermitida } from "./usuarios-regras";

describe("mudancaPermitida", () => {
  const um = [
    { id: "d", perfil: "DONO" as const, ativo: true },
    { id: "s", perfil: "SECRETARIA" as const, ativo: true },
  ];
  it("não deixa o escritório sem dono ativo", () => {
    expect(mudancaPermitida(um, "d", { ativo: false })).toMatch(/Dono/);
    expect(mudancaPermitida(um, "d", { perfil: "FINANCEIRO" })).toMatch(/Dono/);
  });
  it("com dois donos pode", () => {
    const dois = [...um, { id: "d2", perfil: "DONO" as const, ativo: true }];
    expect(mudancaPermitida(dois, "d", { ativo: false })).toBeNull();
    expect(mudancaPermitida(um, "s", { ativo: false })).toBeNull();
  });
});
