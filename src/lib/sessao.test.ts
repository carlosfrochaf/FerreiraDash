import { describe, expect, it } from "vitest";
import { conferirSenha, hashSenha } from "./senha";
import { assinarSessao, lerSessao } from "./sessao";

describe("senha", () => {
  it("guarda com pbkdf2 e confere", async () => {
    const h = await hashSenha("segredo123");
    expect(h.startsWith("pbkdf2$210000$")).toBe(true);
    expect(await conferirSenha("segredo123", h)).toBe(true);
    expect(await conferirSenha("segredo124", h)).toBe(false);
    expect(await hashSenha("segredo123")).not.toBe(h);
  });
  it("formato estranho não passa", async () => {
    expect(await conferirSenha("x", "lixo")).toBe(false);
  });
});

describe("sessao", () => {
  const S = "segredo-de-teste";
  const agora = Date.UTC(2026, 10, 13);
  it("assina e lê os mesmos dados", async () => {
    const t = await assinarSessao({ id: "u1", perfil: "FINANCEIRO", versao: 3 }, S, agora);
    const s = await lerSessao(t, S, agora);
    expect(s).toMatchObject({ id: "u1", perfil: "FINANCEIRO", versao: 3 });
  });
  it("recusa perfil trocado, outro segredo, vencida e perfil inválido", async () => {
    const t = await assinarSessao({ id: "u1", perfil: "ADVOGADO", versao: 1 }, S, agora);
    expect(await lerSessao(t.replace(".ADVOGADO.", ".DONO."), S, agora)).toBeNull();
    expect(await lerSessao(t, "outro", agora)).toBeNull();
    expect(await lerSessao(t, S, agora + 91 * 24 * 3600 * 1000)).toBeNull();
    expect(await lerSessao("u1.CHEFE.1.9999999999999.abc", S, agora)).toBeNull();
    expect(await lerSessao(undefined, S, agora)).toBeNull();
  });
});
