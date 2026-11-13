import { describe, expect, it } from "vitest";
import { documentosMarcados, fichaDadosSchema, OPCOES_FICHA, podeEnviarFicha } from "./ficha";

describe("fichaDadosSchema", () => {
  it("aceita ficha vazia (rascunho)", () => {
    expect(fichaDadosSchema.safeParse({}).success).toBe(true);
  });
  it("aceita datas em branco", () => {
    expect(fichaDadosSchema.safeParse({ contrato: { admissao: "", demissao: "" } }).success).toBe(true);
  });
  it("recusa data em formato errado", () => {
    expect(fichaDadosSchema.safeParse({ contrato: { admissao: "31/12/2026" } }).success).toBe(false);
  });
  it("recusa dia da semana desconhecido", () => {
    expect(fichaDadosSchema.safeParse({ jornada: { dias: ["seg", "xyz"] } }).success).toBe(false);
  });
});

describe("documentosMarcados", () => {
  it("marca sozinho o que já foi enviado", () => {
    const l = documentosMarcados([], ["CTPS"]);
    expect(l.find((d) => d.item === "CTPS")).toEqual({ item: "CTPS", marcado: true, enviado: true });
    expect(l).toHaveLength(OPCOES_FICHA.documentosChecklist.length);
  });
  it("RG E CPF conta como enviado com só o RG", () => {
    expect(documentosMarcados([], ["RG_CNH"]).find((d) => d.item === "RG E CPF")?.enviado).toBe(true);
  });
  it("mantém o que foi marcado à mão", () => {
    const d = documentosMarcados(["ÁUDIOS / VÍDEOS"], []).find((x) => x.item === "ÁUDIOS / VÍDEOS");
    expect(d).toEqual({ item: "ÁUDIOS / VÍDEOS", marcado: true, enviado: false });
  });
});

describe("podeEnviarFicha", () => {
  it("pede a empresa", () => {
    expect(podeEnviarFicha({ advogadoChave: "joao" })).toBe("Informe a empresa.");
  });
  it("pede o advogado", () => {
    expect(podeEnviarFicha({ empresa: "X" })).toBe("Escolha o advogado responsável.");
  });
  it("libera com os dois", () => {
    expect(podeEnviarFicha({ empresa: "X", advogadoChave: "joao" })).toBeNull();
  });
});
