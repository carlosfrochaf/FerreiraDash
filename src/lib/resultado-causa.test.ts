import { describe, expect, it } from "vitest";
import { resultadoDasCausas, type CausaBase, type ItemCausa } from "./resultado-causa";

const causa = (id: string, o: Partial<CausaBase> = {}): CausaBase => ({
  id,
  processoNumero: null,
  clienteId: null,
  clienteNome: "Fulano",
  parcelas: [],
  ...o,
});

const item = (o: Partial<ItemCausa>): ItemCausa => ({
  origem: "LANCAMENTO",
  descricao: "x",
  data: "2026-11-01",
  valor: "100.00",
  tipo: "SAIDA",
  pago: true,
  processoNumero: null,
  clienteId: null,
  clienteNome: null,
  ...o,
});

describe("resultadoDasCausas", () => {
  it("entrou (parcelas recebidas + entradas pagas) menos gastos pagos; pendentes à parte", () => {
    const c = causa("a", {
      processoNumero: "0001234-56.2025.5.02.0001",
      parcelas: [
        { valorEscritorio: "3000.00", statusRecebimento: "RECEBIDO" },
        { valorEscritorio: "1000.00", statusRecebimento: "PENDENTE" },
      ],
    });
    const r = resultadoDasCausas(
      [c],
      [
        item({ origem: "AUDIENCIA", valor: "250.00", processoNumero: "00012345620255020001" }),
        item({ origem: "PETICAO", valor: "400.00", pago: false, processoNumero: "0001234-56.2025.5.02.0001" }),
        item({ valor: "80.50", processoNumero: "0001234-56.2025.5.02.0001" }),
        item({ tipo: "ENTRADA", valor: "500.00", processoNumero: "0001234-56.2025.5.02.0001" }),
      ],
    ).a;
    expect(r.entrou).toBe(3500);
    expect(r.gastou).toBe(330.5);
    expect(r.resultado).toBe(3169.5);
    expect(r.vaiEntrar).toBe(1000);
    expect(r.aPagar).toBe(400);
    expect(r.itens).toHaveLength(4);
  });

  it("número de processo diferente nunca entra", () => {
    const r = resultadoDasCausas([causa("a", { processoNumero: "111", clienteId: "c1" })], [item({ processoNumero: "222", clienteId: "c1" })]).a;
    expect(r.itens).toHaveLength(0);
    expect(r.gastou).toBe(0);
  });

  it("item sem número entra pela pessoa só se ela tiver uma única causa", () => {
    const unica = resultadoDasCausas([causa("a", { processoNumero: "111", clienteId: "c1" })], [item({ clienteId: "c1", origem: "AUDIENCIA" })]);
    expect(unica.a.gastou).toBe(100);

    const duas = resultadoDasCausas([causa("a", { clienteId: "c1" }), causa("b", { clienteId: "c1" })], [item({ clienteId: "c1" })]);
    expect(duas.a.gastou + duas.b.gastou).toBe(0);
  });

  it("lançamento sem número e sem id casa pelo nome do cliente, sem diferenciar maiúsculas e espaços", () => {
    const r = resultadoDasCausas([causa("a", { clienteNome: "Maria  Souza" })], [item({ clienteNome: " maria souza " })]).a;
    expect(r.gastou).toBe(100);
  });

  it("prejuízo dá resultado negativo e soma em centavos", () => {
    const r = resultadoDasCausas([causa("a", { processoNumero: "9" })], [item({ valor: "0.10", processoNumero: "9" }), item({ valor: "0.20", processoNumero: "9" })]).a;
    expect(r.gastou).toBe(0.3);
    expect(r.resultado).toBe(-0.3);
  });

  it("causa sem nada fica zerada", () => {
    expect(resultadoDasCausas([causa("a")], []).a).toEqual({ entrou: 0, gastou: 0, resultado: 0, vaiEntrar: 0, aPagar: 0, itens: [] });
  });
});
