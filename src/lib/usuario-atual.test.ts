import { afterEach, describe, expect, it, vi } from "vitest";
import { ESCRITORIO, exigirPerfilApi } from "./usuario-atual";
import { filtroDoUsuario } from "./acesso-dados";
import { segredoSessao } from "./sessao";

describe("senha única: quem usa é sempre o escritório", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("API devolve o escritório com perfil de dono", async () => {
    const u = await exigirPerfilApi(new Request("http://x/api/clientes"));
    expect(u).toMatchObject({ id: "escritorio", perfil: "DONO" });
  });

  it("não filtra dados", () => {
    expect(filtroDoUsuario(ESCRITORIO)).toEqual({});
  });

  it("segredo cai para CRON_SECRET sem SESSION_SECRET", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("CRON_SECRET", "c");
    expect(segredoSessao()).toBe("c");
  });
});
