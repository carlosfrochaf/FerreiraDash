import { describe, expect, it } from "vitest";
import { corDaMarca, marcaDoAmbiente } from "./marca";

describe("corDaMarca", () => {
  it("sem cor ou cor inválida usa o dourado", () => {
    expect(corDaMarca(undefined)).toEqual(corDaMarca("#D7B340"));
    expect(corDaMarca("#fff")).toEqual(corDaMarca("#D7B340"));
    expect(corDaMarca("azul")).toEqual(corDaMarca("#D7B340"));
    expect(corDaMarca("#D7B340").cor).toBe("hsl(46 65% 55%)");
  });
  it("cor escura demais é clareada para 55%", () => {
    expect(corDaMarca("#1E3A8A").cor).toMatch(/ 55%\)$/);
  });
  it("texto sobre a cor: escuro em cor clara, branco em cor escura", () => {
    expect(corDaMarca("#D7B340").texto).toBe("hsl(222 47% 7%)");
    expect(corDaMarca("#7C3AED").texto).toBe("hsl(0 0% 100%)");
  });
  it("cores médias ficam com o texto de maior contraste (escuro)", () => {
    expect(corDaMarca("#000000").texto).toBe("hsl(222 47% 7%)");
    expect(corDaMarca("#3B82F6").texto).toBe("hsl(222 47% 7%)");
  });
  it("aceita minúsculas", () => {
    expect(corDaMarca("#d7b340")).toEqual(corDaMarca("#D7B340"));
  });
});

describe("marcaDoAmbiente", () => {
  it("sem nada configurado fica Ferreira & Rocha", () => {
    expect(marcaDoAmbiente({})).toEqual({
      nome: "Ferreira & Rocha",
      subtitulo: "Financeiro Jurídico",
      ...corDaMarca(undefined),
      logoUrl: null,
    });
  });
  it("lê nome, subtítulo e logo, sem espaços sobrando", () => {
    const m = marcaDoAmbiente({
      NEXT_PUBLIC_ESCRITORIO_NOME: "  Silva & Sá Advogados ",
      NEXT_PUBLIC_ESCRITORIO_SUBTITULO: "Advocacia Trabalhista",
      ESCRITORIO_LOGO_URL: " https://x/logo.png ",
    });
    expect(m.nome).toBe("Silva & Sá Advogados");
    expect(m.subtitulo).toBe("Advocacia Trabalhista");
    expect(m.logoUrl).toBe("https://x/logo.png");
  });
  it("campos em branco valem como vazios", () => {
    expect(marcaDoAmbiente({ NEXT_PUBLIC_ESCRITORIO_NOME: " ", ESCRITORIO_LOGO_URL: "" })).toEqual(marcaDoAmbiente({}));
  });
});
