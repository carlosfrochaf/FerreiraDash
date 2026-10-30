import { describe, expect, it } from "vitest";
import { camposDaCausa, categoriasDoAvulso, usaFormularioSimples, usadaEmOutraAba } from "./formulario-lancamento";

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

describe("categorias da aba Outro", () => {
  const cats = [
    { id: "1", slug: "AUDIENCIA" },
    { id: "2", slug: "REPASSE_CLIENTE" },
    { id: "3", slug: "ADVOGADO_COLABORADOR" },
    { id: "4", slug: "ALVARA_CAUSA_GANHA" },
    { id: "5", slug: "HONORARIOS_ESCRITORIO" },
    { id: "6", slug: "CUSTO_OPERACIONAL" },
    { id: "7", slug: "SALARIO" },
    { id: "8", slug: "OUTRA_SAIDA" },
    { id: "9", slug: "HONORARIOS_SUCUMBENCIA" },
    { id: "10", slug: "HONORARIOS_CONTRATUAIS" },
    { id: "11", slug: null },
  ];

  it("tira as que já têm aba própria e mantém as avulsas e as criadas pelo usuário", () => {
    expect(categoriasDoAvulso(cats).map((c) => c.id)).toEqual(["6", "7", "8", "9", "10", "11"]);
  });

  it("na edição, mantém a categoria atual do lançamento mesmo se saiu da lista", () => {
    expect(categoriasDoAvulso(cats, "1").map((c) => c.id)).toEqual(["1", "6", "7", "8", "9", "10", "11"]);
  });

  it("usadaEmOutraAba", () => {
    expect(usadaEmOutraAba("AUDIENCIA")).toBe(true);
    expect(usadaEmOutraAba("SALARIO")).toBe(false);
    expect(usadaEmOutraAba(null)).toBe(false);
  });
});
