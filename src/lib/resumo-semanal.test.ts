import { describe, expect, it } from "vitest";
import { ehSegunda, fichasParadas, montarResumoSemanal } from "./resumo-semanal";

describe("ehSegunda", () => {
  it("16/11/2026 é segunda", () => {
    expect(ehSegunda("2026-11-16")).toBe(true);
    expect(ehSegunda("2026-11-13")).toBe(false);
  });
});

describe("montarResumoSemanal", () => {
  it("junta os números da semana", () => {
    const n = montarResumoSemanal({ contratos: 3, fichasSemAdvogado: 2, peticoes: 1, entrou: 4500 });
    expect(n?.title).toBe("Resumo da semana");
    expect(n?.body.replace(/\s/g, " ")).toBe("3 contratos assinados · 1 petição entregue · R$ 4.500,00 entrou · 2 fichas sem advogado");
  });
  it("semana vazia não avisa", () => {
    expect(montarResumoSemanal({ contratos: 0, fichasSemAdvogado: 0, peticoes: 0, entrou: 0 })).toBeNull();
  });
});

describe("fichasParadas", () => {
  const f = (id: string, enviadaEm: string, clienteId = "c1") => ({ id, clienteId, clienteNome: "Ana", empresa: "X", advogadoChave: "joao", enviadaEm });
  it("avisa no 7º, 14º... dia sem petição", () => {
    const l = fichasParadas([f("a", "2026-11-06"), f("b", "2026-11-07"), f("c", "2026-10-30")], [], "2026-11-13");
    expect(l.map((x) => [x.id, x.dias])).toEqual([
      ["a", 7],
      ["c", 14],
    ]);
  });
  it("petição do cliente depois do envio tira da lista", () => {
    expect(fichasParadas([f("a", "2026-11-06")], [{ clienteId: "c1", criadaEm: "2026-11-08" }], "2026-11-13")).toEqual([]);
    expect(fichasParadas([f("a", "2026-11-06")], [{ clienteId: "c1", criadaEm: "2026-11-01" }], "2026-11-13")).toHaveLength(1);
  });
});
