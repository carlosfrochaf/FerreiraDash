import { describe, expect, it } from "vitest";
import { ADVOGADO_A_DEFINIR, avisoDasAudiencias, lerAudiencia } from "./audiencia-intimacao";

describe("avisoDasAudiencias", () => {
  it("nenhuma: sem aviso", () => expect(avisoDasAudiencias([])).toBeNull());
  it("uma: data, hora e cliente; abre a audiência", () => {
    expect(avisoDasAudiencias([{ id: "a1", data: "2027-02-03", hora: "08:45", cliente: "Fulano de Tal" }])).toMatchObject({
      title: "📅 Audiência marcada: 03/02, 08:45",
      body: "Fulano de Tal. Escolher o advogado.",
      url: "/audiencias/a1/editar",
    });
  });
  it("várias: abre a lista", () => {
    const n = avisoDasAudiencias([
      { id: "a1", data: "2027-02-03", hora: "08:45", cliente: "A" },
      { id: "a2", data: "2027-01-27", hora: "08:10", cliente: null },
    ]);
    expect(n).toMatchObject({ title: "📅 2 audiências marcadas", url: "/audiencias" });
  });
  it("advogado padrão", () => expect(ADVOGADO_A_DEFINIR).toBe("A definir"));
});
import { reclamadaDoTexto } from "./intimacoes";

const PUBLICADA = "2026-11-17";

describe("lerAudiencia", () => {
  it("DESIGNO a audiência ... para o dia DD/MM/AAAA HH:MM", () => {
    const t = "ATOrd 0012249-61.2026.5.03.0131 AUTOR: FULANO DE TAL RÉU: MOTOS LTDA INTIMAÇÃO DESPACHO 1. DESIGNO a audiência Inicial por videoconferência para o dia 03/02/2027 08:45, que será realizada de forma telepresencial (online).";
    expect(lerAudiencia(t, PUBLICADA)).toEqual({ data: "2027-02-03", hora: "08:45", tipo: "Inicial", link: null });
  });

  it("certidão com sala virtual: '*Inicial por videoconferência: DD/MM/AAAA às HH:MMh' e link", () => {
    const t = "Certifico que foram disponibilizados os dados de acesso à sala virtual da audiência designada nos presentes autos: *Inicial por videoconferência: 27/01/2027 às 08:10h https://trt3-jus-br.zoom.us/j/85929650763 ID da reunião: 859";
    expect(lerAudiencia(t, PUBLICADA)).toEqual({ data: "2027-01-27", hora: "08:10", tipo: "Inicial", link: "https://trt3-jus-br.zoom.us/j/85929650763" });
  });

  it("CEJUSC: 'Data e horário: DD/MM/AAAA - HH:MM horas'", () => {
    const t = "INTIMO partes e procuradores a comparecerem à audiência para tentativa conciliatória, a saber: Modalidade: Virtual (plataforma ZOOM)Data e horário:  02/12/2026  -  12:00 horasSALA 8  - Link:  https://trt3-jus-br.zoom.us/my/sala8cejusc2  Solicito";
    expect(lerAudiencia(t, PUBLICADA)).toEqual({ data: "2026-12-02", hora: "12:00", tipo: "Conciliação", link: "https://trt3-jus-br.zoom.us/my/sala8cejusc2" });
  });

  it("hora escrita '14h30' e tipo Instrução", () => {
    const t = "Fica redesignada a audiência de instrução para 10/03/2027, às 14h30, na sala de audiências.";
    expect(lerAudiencia(t, PUBLICADA)).toMatchObject({ data: "2027-03-10", hora: "14:30", tipo: "Instrução" });
  });

  it("ignora audiência que já aconteceu", () => {
    const t = "Em audiência realizada em 16/03/2026, compareceram o Autor e as Reclamadas. Proposta de conciliação recusada.";
    expect(lerAudiencia(t, PUBLICADA)).toBeNull();
  });

  it("ignora data passada em relação à publicação", () => {
    const t = "DESIGNO a audiência Inicial para o dia 10/11/2026 08:45.";
    expect(lerAudiencia(t, PUBLICADA)).toBeNull();
  });

  it("ignora data sem hora e texto sem audiência", () => {
    expect(lerAudiencia("Prazo de 5 dias a contar de 20/12/2026.", PUBLICADA)).toBeNull();
    expect(lerAudiencia("Designo perícia para 20/12/2026 às 09:00.", PUBLICADA)).toBeNull();
  });

  it("data inválida (31/02) é ignorada", () => {
    expect(lerAudiencia("DESIGNO a audiência Una para o dia 31/02/2027 08:00.", PUBLICADA)).toBeNull();
  });
});

describe("reclamadaDoTexto", () => {
  it("parte ré do cabeçalho", () => {
    expect(reclamadaDoTexto("ATOrd 0001 AUTOR: FULANO DE TAL RÉU: MOTOS LTDA INTIMAÇÃO Fica V. Sa.")).toBe("MOTOS LTDA");
  });
  it("sem réu: null", () => {
    expect(reclamadaDoTexto("Fica V. Sa. intimado")).toBeNull();
  });
});
