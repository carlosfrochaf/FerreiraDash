import { describe, expect, it } from "vitest";
import { ehImagem, escalaParaPdf, nomePdf } from "./pdf-imagem";

describe("escalaParaPdf", () => {
  it("reduz mantendo a proporção", () => {
    expect(escalaParaPdf(4000, 3000)).toEqual({ largura: 2000, altura: 1500 });
    expect(escalaParaPdf(1000, 3000)).toEqual({ largura: 667, altura: 2000 });
  });
  it("não aumenta foto pequena", () => {
    expect(escalaParaPdf(800, 600)).toEqual({ largura: 800, altura: 600 });
  });
});

describe("ehImagem", () => {
  it("foto sim, PDF não", () => {
    expect(ehImagem("image/heic")).toBe(true);
    expect(ehImagem("image/jpeg")).toBe(true);
    expect(ehImagem("application/pdf")).toBe(false);
  });
});

describe("nomePdf", () => {
  it("troca a extensão", () => {
    expect(nomePdf("RG frente.jpg")).toBe("RG frente.pdf");
    expect(nomePdf("foto")).toBe("foto.pdf");
  });
});
