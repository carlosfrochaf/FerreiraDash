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
