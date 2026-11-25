import { describe, expect, it } from "vitest";
import { assinarLinkSenha, lerLinkSenha, podeMandarLink, LINK_SENHA_MINUTOS } from "./link-senha";
import { assinarSessao } from "./sessao";

const S = "segredo-de-teste";
const AGORA = Date.UTC(2026, 10, 25, 12, 0, 0);

describe("link de nova senha", () => {
  it("vale por 30 minutos e devolve pessoa e versão", async () => {
    const t = await assinarLinkSenha({ id: "u1", versao: 3 }, S, AGORA);
    expect(LINK_SENHA_MINUTOS).toBe(30);
    expect(await lerLinkSenha(t, S, AGORA + 29 * 60_000)).toEqual({ id: "u1", versao: 3 });
    expect(await lerLinkSenha(t, S, AGORA + 31 * 60_000)).toBeNull();
  });
  it("recusa link alterado, de outro segredo ou vazio", async () => {
    const t = await assinarLinkSenha({ id: "u1", versao: 3 }, S, AGORA);
    expect(await lerLinkSenha(t.replace("u1.3", "u2.3"), S, AGORA)).toBeNull();
    expect(await lerLinkSenha(t, "outro", AGORA)).toBeNull();
    expect(await lerLinkSenha(undefined, S, AGORA)).toBeNull();
    expect(await lerLinkSenha("lixo", S, AGORA)).toBeNull();
  });
  it("cookie de sessão não serve como link de senha", async () => {
    const sessao = await assinarSessao({ id: "u1", perfil: "DONO", versao: 3 }, S, AGORA);
    expect(await lerLinkSenha(sessao, S, AGORA)).toBeNull();
  });
});

describe("podeMandarLink", () => {
  it("um e-mail a cada 2 minutos por pessoa", () => {
    expect(podeMandarLink(null, new Date(AGORA))).toBe(true);
    expect(podeMandarLink(new Date(AGORA - 60_000), new Date(AGORA))).toBe(false);
    expect(podeMandarLink(new Date(AGORA - 121_000), new Date(AGORA))).toBe(true);
  });
});

describe("emailNovaSenha", () => {
  it("leva o link, o prazo e escapa o nome no HTML", async () => {
    const { emailNovaSenha } = await import("./link-senha");
    const e = emailNovaSenha("Silva & Sá", "Ana <b>", "https://app/login/nova-senha?t=x");
    expect(e.assunto).toBe("Criar nova senha – Silva & Sá");
    expect(e.texto).toContain("https://app/login/nova-senha?t=x");
    expect(e.texto).toContain("30 minutos");
    expect(e.html).toContain("Ana &lt;b&gt;");
    expect(e.html).toContain("Silva &amp; Sá");
  });
});
