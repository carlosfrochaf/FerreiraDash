import { describe, expect, it } from "vitest";
import { secoesDaFicha } from "./ficha-word";

const base = {
  empresa: "Mercado X",
  advogadoNome: "João Silva",
  cliente: { nome: "Ana", cpf: "12345678901", estadoCivil: null, telefone: "" } as Record<string, unknown>,
};

describe("secoesDaFicha", () => {
  it("formata data, sim/não e dias; pula o que está vazio", () => {
    const s = secoesDaFicha({
      ...base,
      dados: { dataAtendimento: "2026-11-13", contrato: { admissao: "2025-02-01", registroCtps: false, funcaoInicial: "" }, jornada: { dias: ["seg", "sab"] } },
    });
    const atendimento = s.find((x) => x.titulo === "Dados do atendimento")!;
    expect(atendimento.linhas).toContainEqual(["Data do atendimento", "13/11/2026"]);
    expect(atendimento.linhas).toContainEqual(["Advogado(a) responsável", "João Silva"]);
    const cliente = s.find((x) => x.titulo.startsWith("Dados do(a) cliente"))!;
    expect(cliente.linhas.map((l) => l[0])).toEqual(["Nome completo", "CPF"]);
    const contrato = s.find((x) => x.titulo === "Contrato de trabalho")!;
    expect(contrato.linhas).toEqual([
      ["Data de admissão", "01/02/2025"],
      ["Registro em CTPS?", "Não"],
    ]);
    expect(s.find((x) => x.titulo === "Jornada de trabalho")!.linhas).toContainEqual(["Dias trabalhados", "Segunda, Sábado"]);
  });
  it("bloco sem nada preenchido some", () => {
    const s = secoesDaFicha({ ...base, dados: {} });
    expect(s.find((x) => x.titulo === "Verbas rescisórias")).toBeUndefined();
    expect(s.find((x) => x.titulo.startsWith("Dados da empresa"))!.linhas).toEqual([["Nome / razão social", "Mercado X"]]);
  });
  it("documentos e teses viram lista", () => {
    const s = secoesDaFicha({ ...base, dados: { teses: ["HORAS EXTRAS"], relato: "Fazia 12h" } });
    expect(s.find((x) => x.titulo.startsWith("Direitos"))!.linhas).toEqual([["", "HORAS EXTRAS"]]);
    expect(s.find((x) => x.titulo.startsWith("Principais"))!.linhas).toEqual([["", "Fazia 12h"]]);
  });
});
