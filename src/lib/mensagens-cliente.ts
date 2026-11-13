// Monta o contexto do botão de WhatsApp a partir do cliente. Puro.
import type { ContextoWhatsapp } from "@/components/clientes/whatsapp-cliente";
import { faltamParaContrato, textoAudiencia } from "./mensagens";
import { fichaDadosSchema } from "./ficha";
import { dataDoDb, hojeSaoPaulo } from "./datas";

type ClienteComTudo = {
  documentos: { tipo: string }[];
  audiencias: { data: Date; hora: string | null }[];
  fichas: { id: string; empresa: string | null; dados: unknown; createdAt: Date }[];
};

export function contextoWhatsapp(c: ClienteComTudo, hoje = hojeSaoPaulo()): ContextoWhatsapp {
  const tipos = new Set(c.documentos.map((d) => d.tipo));
  const ficha = [...c.fichas].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  const proxima = c.audiencias
    .map((a) => ({ data: dataDoDb(a.data), hora: a.hora }))
    .filter((a) => a.data >= hoje)
    .sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? "")))[0];
  const dados = ficha ? fichaDadosSchema.safeParse(ficha.dados) : null;
  return {
    temContrato: tipos.has("CONTRATO_HONORARIOS"),
    audiencia: proxima ? textoAudiencia(proxima) : null,
    faltam: faltamParaContrato({ temRg: tipos.has("RG_CNH"), temComprovante: tipos.has("COMPROVANTE_ENDERECO"), empresa: ficha?.empresa }),
    fichaId: ficha?.id ?? null,
    provasPedidas: dados?.success ? (dados.data.provasPedidas ?? []) : [],
  };
}

type ClienteDoDia = {
  id: string;
  nome: string;
  telefone: string | null;
  createdAt: Date;
  documentos: { tipo: string; createdAt: Date }[];
  fichas: { empresa: string | null; dados: unknown }[];
};

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

/**
 * Quem vale avisar hoje (fora audiências, que já têm bloco próprio):
 * cliente dos últimos 30 dias sem contrato e com documento faltando; contrato dos últimos 7 dias sem provas pedidas.
 */
export function quemAvisarHoje(clientes: ClienteDoDia[], hoje = hojeSaoPaulo()): { id: string; nome: string; motivo: string }[] {
  const out: { id: string; nome: string; motivo: string }[] = [];
  for (const c of clientes) {
    if (!c.telefone) continue;
    const contrato = c.documentos.find((d) => d.tipo === "CONTRATO_HONORARIOS");
    if (!contrato) {
      const tipos = new Set(c.documentos.map((d) => d.tipo));
      const faltam = faltamParaContrato({ temRg: tipos.has("RG_CNH"), temComprovante: tipos.has("COMPROVANTE_ENDERECO"), empresa: c.fichas.find((f) => f.empresa)?.empresa });
      if (faltam.length && diasEntre(dataDoDb(c.createdAt), hoje) <= 30) out.push({ id: c.id, nome: c.nome, motivo: "Documentos para o contrato" });
      continue;
    }
    const pedidas = c.fichas.some((f) => {
      const d = fichaDadosSchema.safeParse(f.dados);
      return d.success && (d.data.provasPedidas?.length ?? 0) > 0;
    });
    if (!pedidas && diasEntre(dataDoDb(contrato.createdAt), hoje) <= 7) out.push({ id: c.id, nome: c.nome, motivo: "Pedir as provas" });
  }
  return out;
}
