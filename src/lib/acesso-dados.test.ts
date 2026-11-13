import { describe, expect, it } from "vitest";
import { entradaSemValores, filtroDoUsuario, semValores } from "./acesso-dados";
import { resumoPagamentos } from "./meus-pagamentos";

const u = (perfil: "DONO" | "SECRETARIA" | "ADVOGADO", advogadoChave: string | null = null) => ({ id: "x", nome: "X", perfil, advogadoChave });

describe("filtroDoUsuario", () => {
  it("dono vê tudo; advogado só o dele; advogado sem ligação não vê nada", () => {
    expect(filtroDoUsuario(u("DONO"))).toEqual({});
    expect(filtroDoUsuario(u("ADVOGADO", "ana souza"))).toEqual({ advogadoNome: { equals: "ana souza", mode: "insensitive" } });
    expect(filtroDoUsuario(u("ADVOGADO"))).not.toEqual({});
  });
});

describe("valores da secretária", () => {
  it("semValores zera valor e pix só para a secretária", () => {
    const a = { id: "1", valor: "350.00", advogadoPix: "pix", clienteNome: "C" };
    expect(semValores(a, "SECRETARIA")).toMatchObject({ valor: null, advogadoPix: null, clienteNome: "C" });
    expect(semValores(a, "DONO")).toEqual(a);
  });
  it("entrada da secretária perde valor, pagamento e pix", () => {
    const e = entradaSemValores({ advogadoNome: "A", valor: "10", pago: true, dataPagamento: "2026-11-01", advogadoPix: "p" });
    expect(e).toEqual({ advogadoNome: "A" });
  });
});

describe("resumoPagamentos", () => {
  it("soma recebido, a receber e conta sem valor", () => {
    const r = resumoPagamentos([
      { valor: 100, pago: true },
      { valor: 50, pago: true },
      { valor: 80, pago: false },
      { valor: null, pago: false },
    ]);
    expect(r).toEqual({ recebido: 150, aReceber: 80, semValor: 1 });
  });
});
