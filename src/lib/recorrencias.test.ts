import { describe, expect, it } from "vitest";
import { mesDe, mesesQueFaltam, proximoMes, vencimentoNoMes } from "./recorrencias";

describe("datas do mês", () => {
  it("mesDe e proximoMes", () => {
    expect(mesDe("2026-10-31")).toBe("2026-10");
    expect(proximoMes("2026-10")).toBe("2026-11");
    expect(proximoMes("2026-12")).toBe("2027-01");
  });

  it("vencimento limitado ao último dia do mês", () => {
    expect(vencimentoNoMes("2026-11", 31)).toBe("2026-11-30");
    expect(vencimentoNoMes("2027-02", 31)).toBe("2027-02-28");
    expect(vencimentoNoMes("2028-02", 30)).toBe("2028-02-29");
    expect(vencimentoNoMes("2026-12", 31)).toBe("2026-12-31");
    expect(vencimentoNoMes("2026-11", 5)).toBe("2026-11-05");
  });
});

describe("mesesQueFaltam", () => {
  const r = { ativa: true, ultimoMes: "2026-10", diaVencimento: 31 };

  it("nada a criar quando o mês atual já foi lançado", () => {
    expect(mesesQueFaltam(r, "2026-10-31")).toEqual([]);
  });

  it("cria o mês novo no primeiro dia dele", () => {
    expect(mesesQueFaltam(r, "2026-11-01")).toEqual(["2026-11-30"]);
  });

  it("recupera meses atrasados, virando o ano", () => {
    expect(mesesQueFaltam(r, "2027-01-05")).toEqual(["2026-11-30", "2026-12-31", "2027-01-31"]);
  });

  it("recorrência parada não cria nada", () => {
    expect(mesesQueFaltam({ ...r, ativa: false }, "2027-01-05")).toEqual([]);
  });

  it("último mês no futuro não cria nada", () => {
    expect(mesesQueFaltam({ ...r, ultimoMes: "2026-12" }, "2026-11-15")).toEqual([]);
  });
});
