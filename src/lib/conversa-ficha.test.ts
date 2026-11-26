import { describe, expect, it } from "vitest";
import { extracaoSchema, limparConversa, mesclarConversa, type Extracao } from "./conversa-ficha";

const nada = (): Extracao => ({
  cliente: { nome: null, cpf: null, dataNascimento: null, telefone: null, email: null, estadoCivil: null, endereco: null, cep: null, cidadeUf: null },
  empresa: null,
  dadosEmpresa: { cnpj: null, nomeFantasia: null, endereco: null, telefones: null, localTrabalho: null },
  contrato: {
    admissao: null,
    demissao: null,
    funcaoInicial: null,
    funcaoFinal: null,
    salarioInicial: null,
    ultimoSalario: null,
    formaContratacao: null,
    motivoDesligamento: null,
    registroCtps: null,
    avisoPrevio: null,
  },
  jornada: { entrada: null, saida: null, intervalo: null, dias: [], escala: null, horasExtras: null, horasExtrasPagas: null, controlePonto: null, trabalhoNoturno: null },
  ambiente: { epis: null, insalubridade: null, periculosidade: null, acidente: null, assedio: null },
  verbas: { recebeu: null, valorPago: null, seguroDesemprego: null, sacouFgts: null },
  testemunhas: null,
  quantasTestemunhas: null,
  documentos: [],
  relato: null,
});

const vazioAtual = () => ({ dados: {}, cliente: {} as Record<string, string | boolean | null | undefined>, empresa: "" });

describe("mesclarConversa", () => {
  it("preenche o que estava vazio e conta os campos", () => {
    const e = nada();
    e.empresa = "Padaria Pão Certo";
    e.cliente.cidadeUf = "Belo Horizonte/MG";
    e.contrato.admissao = "2024-03-01";
    e.contrato.motivoDesligamento = "DEMISSÃO S/ JUSTA CAUSA";
    e.jornada.entrada = "06:00";
    e.jornada.dias = ["sab", "seg", "ter"];
    e.jornada.horasExtras = true;
    e.documentos = ["PRINTS / MENSAGENS"];
    e.relato = "Trabalhava sem registro.";
    const r = mesclarConversa(vazioAtual(), e);
    expect(r.empresa).toBe("Padaria Pão Certo");
    expect(r.cliente.cidadeUf).toBe("Belo Horizonte/MG");
    expect(r.dados.contrato).toMatchObject({ admissao: "2024-03-01", motivoDesligamento: "DEMISSÃO S/ JUSTA CAUSA" });
    expect(r.dados.jornada).toMatchObject({ entrada: "06:00", horasExtras: true, dias: ["seg", "ter", "sab"] });
    expect(r.dados.documentos).toEqual(["PRINTS / MENSAGENS"]);
    expect(r.dados.relato).toBe("Trabalhava sem registro.");
    expect(r.preenchidos).toBe(9);
  });

  it("nunca troca o que já foi digitado", () => {
    const e = nada();
    e.empresa = "Outra";
    e.contrato.funcaoFinal = "Gerente";
    e.jornada.dias = ["dom"];
    e.relato = "novo";
    const r = mesclarConversa(
      { dados: { contrato: { funcaoFinal: "Caixa" }, jornada: { dias: ["seg"] }, relato: "meu texto" }, cliente: {}, empresa: "Padaria" },
      e,
    );
    expect(r.empresa).toBe("Padaria");
    expect(r.dados.contrato?.funcaoFinal).toBe("Caixa");
    expect(r.dados.jornada?.dias).toEqual(["seg"]);
    expect(r.dados.relato).toBe("meu texto");
    expect(r.preenchidos).toBe(0);
  });

  it("Sim/Não já marcado como false não é trocado; documentos somam sem repetir", () => {
    const e = nada();
    e.contrato.registroCtps = true;
    e.documentos = ["CTPS", "TRCT"];
    const r = mesclarConversa({ dados: { contrato: { registroCtps: false }, documentos: ["CTPS"] }, cliente: {}, empresa: "" }, e);
    expect(r.dados.contrato?.registroCtps).toBe(false);
    expect(r.dados.documentos).toEqual(["CTPS", "TRCT"]);
    expect(r.preenchidos).toBe(1);
  });

  it("data fora do formato é ignorada", () => {
    const e = nada();
    e.contrato.admissao = "março de 2024";
    e.cliente.dataNascimento = "1990-05-02";
    const r = mesclarConversa(vazioAtual(), e);
    expect(r.dados.contrato?.admissao).toBeUndefined();
    expect(r.cliente.dataNascimento).toBe("1990-05-02");
  });

  it("não mexe no objeto da tela", () => {
    const atual = { dados: { contrato: {} }, cliente: {}, empresa: "" };
    const e = nada();
    e.contrato.funcaoFinal = "Caixa";
    mesclarConversa(atual, e);
    expect(atual.dados.contrato).toEqual({});
  });
});

describe("extracaoSchema", () => {
  it("aceita a extração vazia e recusa opção que não existe na ficha", () => {
    expect(extracaoSchema.safeParse(nada()).success).toBe(true);
    const e = nada() as unknown as { contrato: { formaContratacao: string } };
    e.contrato.formaContratacao = "INFORMAL";
    expect(extracaoSchema.safeParse(e).success).toBe(false);
  });
});

describe("limparConversa", () => {
  it("tira mídia oculta, apagadas e aviso de criptografia", () => {
    const txt = [
      "﻿12/11/2026 10:00 - As mensagens e as ligações são protegidas com a criptografia de ponta a ponta.",
      "12/11/2026 10:01 - João: Trabalhei de segunda a sábado",
      "12/11/2026 10:02 - João: <Mídia oculta>",
      "12/11/2026 10:03 - João: Mensagem apagada",
      "12/11/2026 10:04 - João: das 7h às 17h",
    ].join("\r\n");
    expect(limparConversa(txt)).toBe("12/11/2026 10:01 - João: Trabalhei de segunda a sábado\n12/11/2026 10:04 - João: das 7h às 17h");
  });
});
