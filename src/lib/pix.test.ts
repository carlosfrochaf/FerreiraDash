import { describe, expect, it } from "vitest";
import { codigoPix, crc16, normalizarChavePix } from "./pix";

describe("crc16", () => {
  it("bate com o exemplo do manual do Pix (Banco Central)", () => {
    const semCrc =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
      "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(semCrc)).toBe("1D3D");
  });
});

describe("normalizarChavePix", () => {
  it("e-mail, chave aleatória, CNPJ", () => {
    expect(normalizarChavePix(" Winnie@Adv.com ")).toBe("winnie@adv.com");
    expect(normalizarChavePix("123E4567-E12B-12D1-A456-426655440000")).toBe("123e4567-e12b-12d1-a456-426655440000");
    expect(normalizarChavePix("12.345.678/0001-95")).toBe("12345678000195");
  });

  it("CPF válido fica como CPF; celular vira +55", () => {
    expect(normalizarChavePix("529.982.247-25")).toBe("52998224725");
    expect(normalizarChavePix("52998224725")).toBe("52998224725");
    expect(normalizarChavePix("(11) 98765-4321")).toBe("+5511987654321");
    expect(normalizarChavePix("11987654321")).toBe("+5511987654321");
    expect(normalizarChavePix("+55 11 98765-4321")).toBe("+5511987654321");
    // Escrito como telefone (com espaço) vale como celular, mesmo que os números formem um CPF válido.
    expect(normalizarChavePix("52 99822-4725")).toBe("+5552998224725");
  });

  it("formato desconhecido = null", () => {
    expect(normalizarChavePix("winnie")).toBeNull();
    expect(normalizarChavePix("")).toBeNull();
    expect(normalizarChavePix("123")).toBeNull();
  });
});

describe("codigoPix", () => {
  it("monta o Copia e Cola com chave, valor, nome sem acento e CRC", () => {
    const c = codigoPix({ chave: "winnie@adv.com", valor: 100, nome: "Winnie Conceição" });
    expect(c).toBe(
      "00020126360014br.gov.bcb.pix0114winnie@adv.com" +
        "5204000053039865406100.005802BR" +
        "5916Winnie Conceicao6006BRASIL62070503***6304" +
        crc16(
          "00020126360014br.gov.bcb.pix0114winnie@adv.com5204000053039865406100.005802BR5916Winnie Conceicao6006BRASIL62070503***6304"
        )
    );
  });

  it("valor com centavos e nome longo cortado em 25 letras", () => {
    const c = codigoPix({ chave: "52998224725", valor: "1750.5", nome: "Maria Aparecida dos Santos Silva" })!;
    expect(c).toContain("54071750.50");
    expect(c).toContain("5925Maria Aparecida dos Santo");
    expect(c).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("sem chave válida ou sem valor: null", () => {
    expect(codigoPix({ chave: "winnie", valor: 100, nome: "W" })).toBeNull();
    expect(codigoPix({ chave: "winnie@adv.com", valor: 0, nome: "W" })).toBeNull();
  });
});
