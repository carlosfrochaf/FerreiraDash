import { describe, expect, it } from "vitest";
import { nomeNoZip, nomeSeguro, pastaDoTipo } from "./pasta-cliente";

describe("pastaDoTipo", () => {
  it("documentos pessoais e da contratação ficam na raiz", () => {
    expect(pastaDoTipo("RG_CNH")).toBe("");
    expect(pastaDoTipo("PROCURACAO")).toBe("");
  });
  it("prints, holerite e outros vão para Provas", () => {
    expect(pastaDoTipo("PRINTS")).toBe("Provas");
    expect(pastaDoTipo("HOLERITE")).toBe("Provas");
    expect(pastaDoTipo("OUTRO")).toBe("Provas");
  });
  it("peças do processo e comprovantes têm pasta própria", () => {
    expect(pastaDoTipo("PETICAO")).toBe("Processo");
    expect(pastaDoTipo("COMPROVANTE")).toBe("Comprovantes");
  });
});

describe("nomeNoZip", () => {
  it("usa o nome do app com a extensão do arquivo guardado", () => {
    const usados = new Set<string>();
    expect(nomeNoZip({ tipo: "PRINTS", nome: "Prints Chefe", caminho: "c/x-WhatsApp.pdf" }, usados)).toBe("Provas/Prints Chefe.pdf");
    expect(nomeNoZip({ tipo: "RG_CNH", nome: "CNH-e.pdf.pdf", caminho: "c/x-CNH-e.pdf.pdf" }, usados)).toBe("CNH-e.pdf");
  });
  it("repetidos ganham número", () => {
    const usados = new Set<string>();
    expect(nomeNoZip({ tipo: "PRINTS", nome: "Prints", caminho: "a.pdf" }, usados)).toBe("Provas/Prints.pdf");
    expect(nomeNoZip({ tipo: "PRINTS", nome: "Prints", caminho: "b.pdf" }, usados)).toBe("Provas/Prints (2).pdf");
  });
  it("tira caracteres que o Windows não aceita", () => {
    expect(nomeSeguro('a/b:c*?"<>|d')).toBe("a-b-c-d");
  });
});
