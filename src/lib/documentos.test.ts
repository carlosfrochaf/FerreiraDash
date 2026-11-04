import { describe, expect, it } from "vitest";
import { arquivoAceito, documentosFaltando, rotuloTipo } from "./documentos";

describe("documentos", () => {
  it("cliente sem nada: faltam 3 pessoais e 2 por causa", () => {
    const f = documentosFaltando([], [{ id: "A" }]);
    expect(f.pessoais).toEqual(["RG_CNH", "CPF", "COMPROVANTE_ENDERECO"]);
    expect(f.porCausa).toEqual({ A: ["PROCURACAO", "CONTRATO_HONORARIOS"] });
  });

  it("com RG e a procuração da causa A", () => {
    const f = documentosFaltando(
      [
        { tipo: "RG_CNH", recebimentoId: null },
        { tipo: "PROCURACAO", recebimentoId: "A" },
      ],
      [{ id: "A" }, { id: "B" }]
    );
    expect(f.pessoais).toEqual(["CPF", "COMPROVANTE_ENDERECO"]);
    expect(f.porCausa).toEqual({ A: ["CONTRATO_HONORARIOS"], B: ["PROCURACAO", "CONTRATO_HONORARIOS"] });
  });

  it("documento pessoal enviado dentro de uma causa também conta", () => {
    const f = documentosFaltando([{ tipo: "CPF", recebimentoId: "A" }], [{ id: "A" }]);
    expect(f.pessoais).toEqual(["RG_CNH", "COMPROVANTE_ENDERECO"]);
  });

  it("arquivoAceito", () => {
    expect(arquivoAceito("application/pdf", 1000)).toBeNull();
    expect(arquivoAceito("image/jpeg", 1000)).toBeNull();
    expect(arquivoAceito("application/zip", 10)).toBe("Tipo de arquivo não aceito.");
    expect(arquivoAceito("application/pdf", 11 * 1024 * 1024)).toBe("Arquivo maior que 10 MB.");
    expect(arquivoAceito("application/pdf", 0)).toBe("Arquivo vazio.");
  });

  it("rotuloTipo", () => {
    expect(rotuloTipo("COMPROVANTE_ENDERECO")).toBe("Comprovante de endereço");
    expect(rotuloTipo("RG_CNH")).toBe("RG / CNH");
  });
});
