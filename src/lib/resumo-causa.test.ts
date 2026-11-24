import { describe, expect, it } from "vitest";
import { panoramaCausas, resumoCausa } from "./resumo-causa";

const parcela = (valorEscritorio: string, valorCliente: string, recebida: boolean, repassada: boolean) => ({
  valorEscritorio,
  valorCliente,
  statusRecebimento: recebida ? "RECEBIDO" : "PENDENTE",
  statusRepasse: repassada ? "REPASSADO" : "PENDENTE",
});

describe("resumoCausa", () => {
  it("R$ 8.000 em 2 x 4.000, 1ª recebida e repassada", () => {
    const r = resumoCausa([parcela("2000.00", "2000.00", true, true), parcela("400.00", "3600.00", false, false)]);
    expect(r.escritorio).toEqual({ total: 2400, recebido: 2000, falta: 400 });
    expect(r.cliente).toEqual({ total: 5600, repassado: 2000, falta: 3600 });
  });

  it("recebida mas ainda não repassada conta como recebido do escritório e falta do cliente", () => {
    const r = resumoCausa([parcela("2000.00", "2000.00", true, false)]);
    expect(r.escritorio.recebido).toBe(2000);
    expect(r.cliente).toEqual({ total: 2000, repassado: 0, falta: 2000 });
  });

  it("soma em centavos, sem erro de arredondamento", () => {
    const r = resumoCausa([parcela("0.10", "0.20", true, true), parcela("0.20", "0.10", true, true)]);
    expect(r.escritorio).toEqual({ total: 0.3, recebido: 0.3, falta: 0 });
    expect(r.cliente).toEqual({ total: 0.3, repassado: 0.3, falta: 0 });
  });
});

describe("panoramaCausas", () => {
  it("soma o que falta receber, o que dá para repassar agora e conta atrasadas", () => {
    const p = (valorParcela: string, valorCliente: string, recebida: boolean, repassada: boolean, vencimento: string) => ({
      valorParcela,
      valorEscritorio: "0",
      valorCliente,
      statusRecebimento: recebida ? "RECEBIDO" : "PENDENTE",
      statusRepasse: repassada ? "REPASSADO" : "PENDENTE",
      vencimento,
    });
    const r = panoramaCausas(
      [
        [p("1000.00", "700.00", true, true, "2026-10-01"), p("1000.00", "700.00", true, false, "2026-11-01"), p("1000.50", "700.35", false, false, "2026-11-20")],
        [p("500.00", "350.00", false, false, "2026-12-30")],
      ],
      "2026-11-24",
    );
    expect(r).toEqual({ faltaReceber: 1500.5, aRepassar: 700, atrasadas: 1 });
  });
});
