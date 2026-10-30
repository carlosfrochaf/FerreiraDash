import { describe, expect, it } from "vitest";
import { mascaraDigitada, valorFixoDaParcela } from "./formulario-causa";

describe("valorFixoDaParcela", () => {
  it("valor digitado vira decimal fixo", () => {
    expect(valorFixoDaParcela("4.500,00")).toBe("4500.00");
    expect(valorFixoDaParcela("0,04")).toBe("0.04");
  });

  it("vazio ou zero = parcela automática", () => {
    expect(valorFixoDaParcela(undefined)).toBeUndefined();
    expect(valorFixoDaParcela("")).toBeUndefined();
    expect(valorFixoDaParcela("0,00")).toBeUndefined();
  });
});

describe("mascaraDigitada", () => {
  it("apagar tudo deixa o campo vazio (não volta para 0,00)", () => {
    expect(mascaraDigitada("")).toBe("");
    expect(mascaraDigitada("R$ ")).toBe("");
  });

  it("digitando forma o valor em reais", () => {
    expect(mascaraDigitada("4")).toBe("0,04");
    expect(mascaraDigitada("450000")).toBe("4.500,00");
  });
});
