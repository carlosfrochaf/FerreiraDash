import { describe, expect, it } from "vitest";
import { usaFormularioSimples } from "./formulario-lancamento";

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
