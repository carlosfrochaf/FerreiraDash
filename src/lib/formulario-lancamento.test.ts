import { describe, expect, it } from "vitest";
import { camposDaCausa, usaFormularioSimples } from "./formulario-lancamento";

describe("usaFormularioSimples", () => {
  it("só custos operacionais e salários de saída", () => {
    expect(usaFormularioSimples("SAIDA", "CUSTO_OPERACIONAL")).toBe(true);
    expect(usaFormularioSimples("SAIDA", "SALARIO")).toBe(true);
    expect(usaFormularioSimples("SAIDA", "AUDIENCIA")).toBe(false);
    expect(usaFormularioSimples("ENTRADA", "CUSTO_OPERACIONAL")).toBe(false);
    expect(usaFormularioSimples("SAIDA", null)).toBe(false);
    expect(usaFormularioSimples("SAIDA", undefined)).toBe(false);
  });
});

describe("camposDaCausa", () => {
  const v = { processoId: "p1", contatoId: "", processoNumero: "123", clienteNome: "João", reclamada: "" };

  it("formulário completo envia só os campos preenchidos", () => {
    expect(camposDaCausa(false, false, v)).toEqual([
      ["processoId", "p1"],
      ["processoNumero", "123"],
      ["clienteNome", "João"],
    ]);
  });

  it("custo novo não envia nada da causa", () => {
    expect(camposDaCausa(true, false, v)).toEqual([]);
  });

  it("editar para custo limpa os dados da causa que já estavam gravados", () => {
    expect(camposDaCausa(true, true, v)).toEqual([
      ["processoId", ""],
      ["contatoId", ""],
      ["processoNumero", ""],
      ["clienteNome", ""],
      ["reclamada", ""],
    ]);
  });
});
