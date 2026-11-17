import { describe, expect, it } from "vitest";
import { chaveIntimacao, lerOab, resumoDoDia, semRepetidas, tipoDaIntimacao, vincularProcesso, type ComunicacaoCnj } from "./intimacoes";

const c = (o: Partial<ComunicacaoCnj>): ComunicacaoCnj => ({
  id: "1",
  data_disponibilizacao: "2026-11-16",
  numero_processo: "00112456620255030149",
  tipoDocumento: "Notificação",
  texto: "",
  ...o,
});

describe("tipoDaIntimacao", () => {
  it("pelo documento citado no texto", () => {
    expect(tipoDaIntimacao(c({ texto: "Fica intimado... Sentença ID 2e47ed7 proferida nos autos" }))).toBe("SENTENCA");
    expect(tipoDaIntimacao(c({ texto: "Despacho ID 6d25a0a proferido nos autos" }))).toBe("DESPACHO");
    expect(tipoDaIntimacao(c({ texto: "Decisão ID abc1234 proferida" }))).toBe("DECISAO");
  });
  it("pelo tipo do documento e por audiência", () => {
    expect(tipoDaIntimacao(c({ tipoDocumento: "Acórdão", texto: "RECORRENTE: X" }))).toBe("ACORDAO");
    expect(tipoDaIntimacao(c({ texto: "Fica a parte intimada da AUDIÊNCIA designada para 20/11" }))).toBe("AUDIENCIA");
    expect(tipoDaIntimacao(c({ texto: "Certifico que foram disponibilizados valores" }))).toBe("OUTRA");
  });
});

describe("chaveIntimacao / semRepetidas", () => {
  it("as duas cópias do mesmo despacho (um por advogado) viram uma", () => {
    const a = c({ id: "10", hash: "aaa", texto: "Para: Carlos... Despacho ID 6d25a0a proferido" });
    const b = c({ id: "11", hash: "bbb", texto: "Para: Miller... Despacho ID 6d25a0a proferido" });
    expect(chaveIntimacao(a)).toBe(chaveIntimacao(b));
    expect(semRepetidas([a, b]).map((x) => x.id)).toEqual(["10"]);
  });
  it("sem ID: mesmo texto junta, texto diferente separa", () => {
    const a = c({ id: "1", texto: "Certifico valores  disponíveis" });
    const b = c({ id: "2", texto: "Certifico valores disponíveis" });
    const d = c({ id: "3", texto: "Fica intimado o beneficiário" });
    expect(semRepetidas([a, b, d]).map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("acórdão: a versão de cada parte intimada vira uma só", () => {
    const a = c({ id: "1", tipoDocumento: "Acórdão", texto: "Ficam intimadas: MARCIO DA SILVA" });
    const b = c({ id: "2", tipoDocumento: "Acórdão", texto: "Ficam intimadas: CELULOSE NIPO" });
    expect(semRepetidas([a, b]).map((x) => x.id)).toEqual(["1"]);
  });

  it("outro dia ou outro processo não junta", () => {
    const a = c({ texto: "Despacho ID 6d25a0a" });
    expect(chaveIntimacao(a)).not.toBe(chaveIntimacao({ ...a, data_disponibilizacao: "2026-11-17" }));
    expect(chaveIntimacao(a)).not.toBe(chaveIntimacao({ ...a, numero_processo: "1" }));
  });
});

describe("vincularProcesso", () => {
  const causas = [{ id: "r1", processoNumero: "0011245-66.2025.5.03.0149", clienteNome: "Ana" }];
  it("pela causa, ignorando pontuação", () => {
    expect(vincularProcesso("00112456620255030149", causas, [])).toEqual({ clienteNome: "Ana", recebimentoId: "r1" });
  });
  it("sem causa, pela audiência/petição", () => {
    expect(vincularProcesso("123", causas, [{ processoNumero: "1-2-3", clienteNome: "Bia" }])).toEqual({ clienteNome: "Bia", recebimentoId: null });
  });
  it("sem nada, fica solta", () => {
    expect(vincularProcesso("999", causas, [{ processoNumero: "999", clienteNome: null }])).toEqual({ clienteNome: null, recebimentoId: null });
  });
});

describe("resumoDoDia", () => {
  it("conta por tipo, sentença primeiro", () => {
    expect(resumoDoDia(["DESPACHO", "SENTENCA", "DESPACHO"])).toBe("3 intimações novas: 1 sentença, 2 despachos");
    expect(resumoDoDia(["OUTRA"])).toBe("1 intimação nova: 1 intimação");
  });
});

describe("lerOab", () => {
  it("aceita jeitos comuns de escrever", () => {
    expect(lerOab("148002/MG")).toEqual({ numero: "148002", uf: "MG" });
    expect(lerOab("mg 148.002")).toEqual({ numero: "148002", uf: "MG" });
    expect(lerOab("OAB/MG 139761")).toEqual({ numero: "139761", uf: "MG" });
  });
  it("recusa UF inválida ou número curto", () => {
    expect(lerOab("148002/XX")).toBeNull();
    expect(lerOab("12/MG")).toBeNull();
  });
});
