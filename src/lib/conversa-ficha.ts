// Ficha pela conversa do WhatsApp: o formato que a IA devolve e como ele entra na ficha. Puro.
import { z } from "zod/v4";
import { OPCOES_FICHA, type FichaDados } from "./ficha";

/** Conversa maior que isso não vai para a IA (avisamos em vez de cortar escondido). */
export const MAXIMO_CARACTERES = 400_000;

const O = OPCOES_FICHA;
const t = z.string().nullable();
const sn = z.boolean().nullable();
const dataIso = z.string().nullable().describe("AAAA-MM-DD, ou null se não souber o dia exato");
const opcao = <T extends readonly [string, ...string[]]>(v: T) => z.enum(v).nullable();
const DIAS = O.dias.map((d) => d.valor) as unknown as readonly [string, ...string[]];

/** O que a IA devolve. Tudo null quando a conversa não diz. */
export const extracaoSchema = z.object({
  cliente: z.object({
    nome: t,
    cpf: t,
    dataNascimento: dataIso,
    telefone: t,
    email: t,
    estadoCivil: opcao(O.estadoCivil),
    endereco: t,
    cep: t,
    cidadeUf: t,
  }),
  empresa: t.describe("nome da empresa reclamada"),
  dadosEmpresa: z.object({ cnpj: t, nomeFantasia: t, endereco: t, telefones: t, localTrabalho: t }),
  contrato: z.object({
    admissao: dataIso,
    demissao: dataIso,
    funcaoInicial: t,
    funcaoFinal: t,
    salarioInicial: t,
    ultimoSalario: t,
    formaContratacao: opcao(O.formaContratacao),
    motivoDesligamento: opcao(O.motivoDesligamento),
    registroCtps: sn,
    avisoPrevio: opcao(O.avisoPrevio),
  }),
  jornada: z.object({
    entrada: t.describe("horário, ex.: 07:00"),
    saida: t,
    intervalo: t,
    dias: z.array(z.enum(DIAS)).describe("dias da semana trabalhados"),
    escala: t,
    horasExtras: sn,
    horasExtrasPagas: opcao(O.horasExtrasPagas),
    controlePonto: opcao(O.controlePonto),
    trabalhoNoturno: sn,
  }),
  ambiente: z.object({ epis: opcao(O.epis), insalubridade: sn, periculosidade: sn, acidente: sn, assedio: sn }),
  verbas: z.object({ recebeu: opcao(O.verbasRecebidas), valorPago: t, seguroDesemprego: sn, sacouFgts: sn }),
  testemunhas: sn,
  quantasTestemunhas: t,
  documentos: z.array(z.enum(O.documentosChecklist)).describe("documentos e provas que o cliente disse ter ou já mandou"),
  relato: t.describe("resumo curto do caso, em terceira pessoa"),
});

export type Extracao = z.infer<typeof extracaoSchema>;

type Valor = string | boolean | null | undefined | string[];
const vazio = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;
const CAMPOS_DATA = new Set(["admissao", "demissao", "dataNascimento"]);

/** Valor da IA que pode entrar no campo: não vazio e, se for data, no formato certo. */
function aceitavel(k: string, v: unknown): v is string | boolean {
  if (vazio(v)) return false;
  if (CAMPOS_DATA.has(k)) return typeof v === "string" && DATA_OK.test(v);
  return typeof v === "string" || typeof v === "boolean";
}

export type Mesclado = { dados: FichaDados; cliente: Record<string, Valor>; empresa: string; preenchidos: number };

/** Junta a extração na ficha da tela. Só preenche o que está vazio; nunca apaga o que já foi digitado. */
export function mesclarConversa(atual: { dados: FichaDados; cliente: Record<string, Valor>; empresa: string }, e: Extracao): Mesclado {
  let preenchidos = 0;
  const dados: FichaDados = structuredClone(atual.dados);
  const cliente = { ...atual.cliente };

  const encher = (alvo: Record<string, unknown>, origem: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(origem)) {
      if (Array.isArray(v) || !aceitavel(k, v) || !vazio(alvo[k])) continue;
      alvo[k] = typeof v === "string" ? v.trim() : v;
      preenchidos++;
    }
  };

  encher(cliente, e.cliente);
  let empresa = atual.empresa;
  if (vazio(empresa) && aceitavel("empresa", e.empresa)) {
    empresa = String(e.empresa).trim();
    preenchidos++;
  }

  const bloco = <B extends "empresa" | "contrato" | "jornada" | "ambiente" | "verbas" | "outras">(b: B, origem: Record<string, unknown>) => {
    const alvo = { ...((dados[b] as Record<string, unknown> | undefined) ?? {}) };
    encher(alvo, origem);
    (dados as Record<string, unknown>)[b] = alvo;
  };
  bloco("empresa", e.dadosEmpresa);
  bloco("contrato", e.contrato);
  const { dias, ...jornada } = e.jornada;
  bloco("jornada", jornada);
  if (dias.length && !dados.jornada?.dias?.length) {
    dados.jornada = { ...dados.jornada, dias: O.dias.map((d) => d.valor).filter((d) => dias.includes(d)) };
    preenchidos++;
  }
  bloco("ambiente", e.ambiente);
  bloco("verbas", e.verbas);
  bloco("outras", { testemunhas: e.testemunhas, quantasTestemunhas: e.quantasTestemunhas });

  const novosDocs = e.documentos.filter((d) => !(dados.documentos ?? []).includes(d));
  if (novosDocs.length) {
    dados.documentos = [...(dados.documentos ?? []), ...novosDocs];
    preenchidos += novosDocs.length;
  }
  if (vazio(dados.relato) && aceitavel("relato", e.relato)) {
    dados.relato = String(e.relato).trim();
    preenchidos++;
  }
  return { dados, cliente, empresa, preenchidos };
}

/** Tira do texto exportado o que não ajuda (mídia oculta, mensagens apagadas, aviso de criptografia). */
export function limparConversa(texto: string): string {
  return texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => !/<(M[íi]dia oculta|Media omitted)>|Mensagem apagada|This message was deleted|criptografia de ponta a ponta|end-to-end encrypted/i.test(l))
    .join("\n")
    .trim();
}
