import { describe, expect, it } from "vitest";
import { avisoFichasParadas, limiteFichaParada } from "./fichas-paradas";

describe("limiteFichaParada", () => {
  it("3 dias antes de hoje, começo do dia em São Paulo", () => {
    expect(limiteFichaParada("2026-11-27").toISOString()).toBe("2026-11-24T03:00:00.000Z");
  });
});

describe("avisoFichasParadas", () => {
  it("nenhuma: sem aviso", () => {
    expect(avisoFichasParadas([])).toBeNull();
  });

  it("uma: abre a própria ficha", () => {
    expect(avisoFichasParadas([{ fichaId: "f1", clienteId: "c1", nome: "DAYANE APARECIDA OLIVEIRA" }])).toEqual({
      title: "📋 Ficha parada há 3 dias ou mais",
      body: "DAYANE APARECIDA OLIVEIRA. Preencher a ficha.",
      url: "/clientes/c1/fichas/f1",
      tag: "fichas-paradas",
    });
  });

  it("várias: lista os nomes (até 4) e abre Clientes", () => {
    const fs = ["A", "B", "C", "D", "E"].map((n, i) => ({ fichaId: `f${i}`, clienteId: `c${i}`, nome: n }));
    expect(avisoFichasParadas(fs)).toMatchObject({
      title: "📋 5 fichas paradas há 3 dias ou mais",
      body: "A, B, C, D e mais 1.",
      url: "/clientes",
    });
  });
});
