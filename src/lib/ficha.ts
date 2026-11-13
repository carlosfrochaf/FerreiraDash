import { z } from "zod";
import type { Perfil } from "./perfis";
import { chaveAdvogado } from "./advogado-chave";
import type { TipoDoc } from "./documentos";

/** Opções fixas da ficha, com os mesmos textos da ficha antiga do escritório. */
export const OPCOES_FICHA = {
  estadoCivil: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"],
  origem: ["Meta Ads", "Indicação", "Google", "Instagram", "Outro"],
  formaContratacao: ["CLT", "PJ", "AUTÔNOMO", "ESTÁGIO", "OUTRO"],
  motivoDesligamento: ["PEDIDO DE DEMISSÃO", "DEMISSÃO S/ JUSTA CAUSA", "DEMISSÃO C/ JUSTA CAUSA", "RESCISÃO INDIRETA", "ACORDO"],
  avisoPrevio: ["TRABALHADO", "INDENIZADO", "DISPENSADO", "NÃO TEVE"],
  controlePonto: ["CARTÃO", "MANUAL", "ELETRÔNICO", "NÃO HAVIA"],
  horasExtrasPagas: ["SIM", "NÃO", "PARCIALMENTE"],
  epis: ["SIM", "NÃO", "INSUFICIENTES"],
  verbasRecebidas: ["SIM", "NÃO", "PARCIALMENTE"],
  dias: [
    { valor: "seg", rotulo: "SEGUNDA" },
    { valor: "ter", rotulo: "TERÇA" },
    { valor: "qua", rotulo: "QUARTA" },
    { valor: "qui", rotulo: "QUINTA" },
    { valor: "sex", rotulo: "SEXTA" },
    { valor: "sab", rotulo: "SÁBADO" },
    { valor: "dom", rotulo: "DOMINGO" },
  ],
  teses: [
    "RECONHECIMENTO DE VÍNCULO",
    "CORREÇÃO DE VERBAS",
    "RESCISÃO INDIRETA",
    "HORAS EXTRAS",
    "ASSÉDIO MORAL",
    "INSALUBRIDADE",
    "ASSÉDIO SEXUAL",
    "ACÚMULO DE FUNÇÃO",
    "REVERSÃO DE JUSTA CAUSA",
    "REVERSÃO PED. DEMISSÃO",
    "ESTABILIDADE",
    "PERICULOSIDADE",
    "ADICIONAL NOTURNO",
  ],
  documentosChecklist: [
    "CTPS",
    "RG E CPF",
    "COMP. RESIDÊNCIA",
    "TRCT",
    "COMP. PAGAMENTO",
    "HOLERITES",
    "EXTRATO FGTS",
    "CARTÕES DE PONTO",
    "CONTRATO DE TRABALHO",
    "AVISO PRÉVIO",
    "ATESTADOS / LAUDOS",
    "CAT",
    "PRINTS / MENSAGENS",
    "ÁUDIOS / VÍDEOS",
  ],
} as const;

/** Item da lista da ficha → tipos de documento do app que o comprovam. */
export const CHECKLIST_PARA_TIPOS: Record<string, TipoDoc[]> = {
  CTPS: ["CTPS"],
  "RG E CPF": ["RG_CNH", "CPF"],
  "COMP. RESIDÊNCIA": ["COMPROVANTE_ENDERECO"],
  TRCT: ["TRCT"],
  "COMP. PAGAMENTO": ["COMPROVANTE"],
  HOLERITES: ["HOLERITE"],
  "EXTRATO FGTS": ["EXTRATO_FGTS"],
  "CARTÕES DE PONTO": ["CARTAO_PONTO"],
  "CONTRATO DE TRABALHO": ["CONTRATO_TRABALHO"],
  "AVISO PRÉVIO": ["AVISO_PREVIO"],
  "ATESTADOS / LAUDOS": ["ATESTADO"],
  CAT: ["CAT"],
  "PRINTS / MENSAGENS": ["PRINTS"],
  "ÁUDIOS / VÍDEOS": [],
};

const texto = z.string().max(5000).optional();
const data = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida (use AAAA-MM-DD)")
  .optional();
const simNao = z.boolean().nullable().optional();
const DIAS = OPCOES_FICHA.dias.map((d) => d.valor) as [string, ...string[]];

export const fichaDadosSchema = z.object({
  dataAtendimento: data,
  empresa: z
    .object({ cnpj: texto, nomeFantasia: texto, email: texto, endereco: texto, telefones: texto, localTrabalho: texto })
    .partial()
    .optional(),
  contrato: z
    .object({
      admissao: data,
      demissao: data,
      funcaoInicial: texto,
      funcaoFinal: texto,
      salarioInicial: texto,
      ultimoSalario: texto,
      formaContratacao: texto,
      motivoDesligamento: texto,
      registroCtps: simNao,
      avisoPrevio: texto,
      dataAvisoPrevio: data,
      mudancaFuncao: simNao,
      quandoMudou: texto,
      comissoes: simNao,
      valorMedioComissoes: texto,
    })
    .partial()
    .optional(),
  jornada: z
    .object({
      entrada: texto,
      saida: texto,
      intervalo: texto,
      dias: z.array(z.enum(DIAS)).optional(),
      escala: texto,
      horasExtras: simNao,
      horasExtrasPagas: texto,
      controlePonto: texto,
      trabalhoNoturno: simNao,
      adicionalNoturno: simNao,
    })
    .partial()
    .optional(),
  ambiente: z
    .object({ epis: texto, insalubridade: simNao, periculosidade: simNao, recebiaAdicionais: simNao, acidente: simNao, assedio: simNao })
    .partial()
    .optional(),
  verbas: z
    .object({
      recebeu: texto,
      valorPago: texto,
      dataPagamento: data,
      recebeuTrct: simNao,
      seguroDesemprego: simNao,
      parcelasSeguro: texto,
      sacouFgts: simNao,
    })
    .partial()
    .optional(),
  relato: z.string().max(50000).optional(),
  documentos: z.array(z.string().max(100)).max(50).optional(),
  teses: z.array(z.string().max(100)).max(50).optional(),
  outras: z
    .object({ testemunhas: simNao, quantasTestemunhas: texto, acaoAnterior: simNao, outrasAcoes: simNao, observacoes: z.string().max(20000).optional() })
    .partial()
    .optional(),
});

export type FichaDados = z.infer<typeof fichaDadosSchema>;

/** Lista de documentos da ficha: marcado à mão ou já enviado ao app. */
export function documentosMarcados(
  marcadosAMao: string[],
  tiposEnviados: string[],
): { item: string; marcado: boolean; enviado: boolean }[] {
  const enviados = new Set(tiposEnviados);
  return OPCOES_FICHA.documentosChecklist.map((item) => {
    const enviado = (CHECKLIST_PARA_TIPOS[item] ?? []).some((t) => enviados.has(t));
    return { item, enviado, marcado: enviado || marcadosAMao.includes(item) };
  });
}

/** Motivo para não enviar ao advogado, ou null se pode. */
export function podeEnviarFicha(f: { empresa?: string | null; advogadoChave?: string | null }): string | null {
  if (!f.empresa?.trim()) return "Informe a empresa.";
  if (!f.advogadoChave?.trim()) return "Escolha o advogado responsável.";
  return null;
}

/** Dono e secretária editam qualquer ficha; o advogado só aquela em que é o responsável. */
export function podeEditarFicha(
  u: { perfil: Perfil; advogadoChave: string | null },
  ficha: { advogadoChave: string | null },
): boolean {
  if (u.perfil === "DONO" || u.perfil === "SECRETARIA") return true;
  if (u.perfil !== "ADVOGADO" || !u.advogadoChave || !ficha.advogadoChave) return false;
  return chaveAdvogado(u.advogadoChave) === chaveAdvogado(ficha.advogadoChave);
}
