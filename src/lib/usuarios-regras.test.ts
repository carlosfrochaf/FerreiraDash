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
