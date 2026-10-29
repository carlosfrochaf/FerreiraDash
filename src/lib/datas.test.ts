import { describe, expect, it } from "vitest";
import { dataLocal, diasAte, formatarData, formatarDataCurta, hojeSaoPaulo } from "./datas";

describe("datas", () => {
  it("formata sem deslocar o dia por causa do fuso", () => {
    expect(formatarData("2026-11-20")).toBe("20/11/2026");
    expect(formatarDataCurta("2026-11-20")).toBe("20 nov 2026");
    expect(formatarData("2026-11-20T00:00:00.000Z")).toBe("20/11/2026");
    const d = dataLocal("2026-11-20");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 20]);
  });

  it("conta dias até o vencimento", () => {
    expect(diasAte("2026-11-20", "2026-11-20")).toBe(0);
    expect(diasAte("2026-11-23", "2026-11-20")).toBe(3);
    expect(diasAte("2026-11-18", "2026-11-20")).toBe(-2);
    expect(diasAte("2027-03-01", "2027-02-28")).toBe(1);
  });

  it("usa o dia de Brasília, não o UTC", () => {
    // 29/10/2026 às 23h30 em Brasília = 30/10 02h30 UTC
    expect(hojeSaoPaulo(new Date("2026-10-30T02:30:00Z"))).toBe("2026-10-29");
  });
});
