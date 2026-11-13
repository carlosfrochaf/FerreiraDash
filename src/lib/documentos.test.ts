import { describe, expect, it } from "vitest";
import { arquivoAceito, documentosFaltando, rotuloTipo } from "./documentos";

describe("documentos", () => {
  it("cliente sem nada: faltam 2 fotos pessoais e 3 por causa", () => {
    const f = documentosFaltando([], [{ id: "A" }]);
    expect(f.pessoais).toEqual(["RG_CNH", "COMPROVANTE_ENDERECO"]);
    expect(f.porCausa).toEqual({ A: ["PROCURACAO", "CONTRATO_HONORARIOS", "DECLARACAO_HIPOSSUFICIENCIA"] });
  });

  it("com RG e a procuração da causa A", () => {
    const f = documentosFaltando(
      [
        { tipo: "RG_CNH", recebimentoId: null },
        { tipo: "PROCURACAO", recebimentoId: "A" },
      ],
      [{ id: "A" }, { id: "B" }]
    );
    expect(f.pessoais).toEqual(["COMPROVANTE_ENDERECO"]);
    expect(f.porCausa).toEqual({ A: ["CONTRATO_HONORARIOS", "DECLARACAO_HIPOSSUFICIENCIA"], B: ["PROCURACAO", "CONTRATO_HONORARIOS", "DECLARACAO_HIPOSSUFICIENCIA"] });
  });

  it("documento pessoal enviado dentro de uma causa também conta", () => {
    const f = documentosFaltando([{ tipo: "RG_CNH", recebimentoId: "A" }], [{ id: "A" }]);
    expect(f.pessoais).toEqual(["COMPROVANTE_ENDERECO"]);
  });

  it("arquivoAceito", () => {
    expect(arquivoAceito("application/pdf", 1000)).toBeNull();
    expect(arquivoAceito("image/jpeg", 1000)).toBe("Envie em PDF (fotos viram PDF sozinhas).");
    expect(arquivoAceito("application/zip", 10)).toBe("Envie em PDF (fotos viram PDF sozinhas).");
    expect(arquivoAceito("application/pdf", 11 * 1024 * 1024)).toBe("Arquivo maior que 10 MB.");
    expect(arquivoAceito("application/pdf", 0)).toBe("Arquivo vazio.");
  });

  it("rotuloTipo", () => {
    expect(rotuloTipo("EXTRATO_FGTS")).toBe("Extrato do FGTS");
    expect(rotuloTipo("COMPROVANTE_ENDERECO")).toBe("Comprovante de endereço");
    expect(rotuloTipo("RG_CNH")).toBe("RG / CNH");
  });

  it("CPF é número do cadastro, não foto", () => {
    expect(documentosFaltando([], [], null).cpf).toBe(true);
    expect(documentosFaltando([], [], "12345678909").cpf).toBe(false);
    expect(documentosFaltando([], []).cpf).toBe(false);
    expect(documentosFaltando([{ tipo: "CPF", recebimentoId: null }], [], null).cpf).toBe(true);
  });
});
