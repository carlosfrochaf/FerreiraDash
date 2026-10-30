import { describe, expect, it } from "vitest";
import { resumoCausa } from "./resumo-causa";

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
