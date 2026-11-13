import { describe, expect, it } from "vitest";
import { faltamParaContrato, linkComTexto, MODELOS_PADRAO, modelosDoMomento, preencher, textoAudiencia } from "./mensagens";

describe("faltamParaContrato", () => {
  it("lista só o que falta", () => {
    expect(faltamParaContrato({ temRg: false, temComprovante: true, empresa: "" })).toEqual(["Foto do RG ou CNH (frente e verso)", "Nome da empresa onde trabalhou"]);
    expect(faltamParaContrato({ temRg: true, temComprovante: true, empresa: "X" })).toEqual([]);
  });
});

describe("preencher", () => {
  it("troca as marcas e vira lista com •", () => {
    const t = preencher("Olá, {nome}! Do {escritorio}:\n{faltam}\nFim", { nome: "Ana Souza", escritorio: "F&R", faltam: ["RG", "Comprovante"] });
    expect(t).toBe("Olá, Ana! Do F&R:\n• RG\n• Comprovante\nFim");
  });
  it("lista vazia some com a linha", () => {
    expect(preencher("A\n{provas}\nB", { nome: "Ana", escritorio: "F", provas: [] })).toBe("A\nB");
  });
});

describe("modelosDoMomento", () => {
  const m = [
    { id: "1", momento: "ANTES_CONTRATO" as const },
    { id: "2", momento: "DEPOIS_CONTRATO" as const },
    { id: "3", momento: "AUDIENCIA" as const },
    { id: "4", momento: "SEMPRE" as const },
  ];
  it("antes do contrato e sem audiência", () => {
    expect(modelosDoMomento(m, { temContrato: false, temAudiencia: false }).map((x) => x.id)).toEqual(["1", "4"]);
  });
  it("com contrato e audiência", () => {
    expect(modelosDoMomento(m, { temContrato: true, temAudiencia: true }).map((x) => x.id)).toEqual(["2", "3", "4"]);
  });
});

describe("textoAudiencia e link", () => {
  it("data e hora por extenso", () => {
    expect(textoAudiencia({ data: "2026-11-20", hora: "14:30" })).toBe("20/11 (sexta-feira) às 14:30");
    expect(textoAudiencia({ data: "2026-11-20", hora: null })).toBe("20/11 (sexta-feira)");
  });
  it("link do WhatsApp com o texto", () => {
    expect(linkComTexto("(11) 98888-7777", "Oi & tchau")).toBe("https://wa.me/5511988887777?text=Oi%20%26%20tchau");
    expect(linkComTexto("123", "x")).toBeNull();
  });
  it("modelos padrão usam as marcas", () => {
    expect(MODELOS_PADRAO.map((m) => m.momento)).toEqual(["ANTES_CONTRATO", "DEPOIS_CONTRATO", "AUDIENCIA"]);
    expect(MODELOS_PADRAO[0].texto).toContain("{faltam}");
    expect(MODELOS_PADRAO[1].texto).toContain("{provas}");
  });
});

describe("contextoWhatsapp", async () => {
  const { contextoWhatsapp } = await import("./mensagens-cliente");
  it("junta contrato, próxima audiência, o que falta e as provas da ficha mais nova", () => {
    const ctx = contextoWhatsapp(
      {
        documentos: [{ tipo: "RG_CNH" }, { tipo: "CONTRATO_HONORARIOS" }],
        audiencias: [
          { data: new Date("2026-11-01T00:00:00Z"), hora: "10:00" },
          { data: new Date("2026-11-20T00:00:00Z"), hora: "14:30" },
        ],
        fichas: [
          { id: "velha", empresa: null, dados: {}, createdAt: new Date("2026-01-01") },
          { id: "nova", empresa: "Mercado X", dados: { provasPedidas: ["Áudios"] }, createdAt: new Date("2026-11-10") },
        ],
      },
      "2026-11-13",
    );
    expect(ctx).toEqual({ temContrato: true, audiencia: "20/11 (sexta-feira) às 14:30", faltam: ["Comprovante de endereço"], fichaId: "nova", provasPedidas: ["Áudios"] });
  });
});

describe("quemAvisarHoje", async () => {
  const { quemAvisarHoje } = await import("./mensagens-cliente");
  const dia = (s: string) => new Date(`${s}T12:00:00Z`);
  it("documentos do contrato para cliente novo e provas para contrato recente", () => {
    const l = quemAvisarHoje(
      [
        { id: "a", nome: "Ana", telefone: "11988887777", createdAt: dia("2026-11-10"), documentos: [], fichas: [] },
        { id: "b", nome: "Bia", telefone: "11988887777", createdAt: dia("2026-10-01"), documentos: [{ tipo: "CONTRATO_HONORARIOS", createdAt: dia("2026-11-12") }], fichas: [{ empresa: "X", dados: {} }] },
        { id: "c", nome: "Caio", telefone: "11988887777", createdAt: dia("2026-11-01"), documentos: [{ tipo: "CONTRATO_HONORARIOS", createdAt: dia("2026-11-12") }], fichas: [{ empresa: "X", dados: { provasPedidas: ["Áudios"] } }] },
        { id: "d", nome: "Dani", telefone: null, createdAt: dia("2026-11-10"), documentos: [], fichas: [] },
        { id: "e", nome: "Edu", telefone: "11988887777", createdAt: dia("2026-08-01"), documentos: [], fichas: [] },
      ],
      "2026-11-13",
    );
    expect(l).toEqual([
      { id: "a", nome: "Ana", motivo: "Documentos para o contrato" },
      { id: "b", nome: "Bia", motivo: "Pedir as provas" },
    ]);
  });
});
