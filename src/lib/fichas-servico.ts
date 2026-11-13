import webpush from "web-push";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { chaveAdvogado } from "./advogado-chave";
import { dataDoDb, dataParaDb } from "./datas";
import { fichaDadosSchema, type FichaDados } from "./ficha";

// Campo do cadastro editado pela ficha: "" apaga, ausente não mexe.
const campo = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

export const fichaClienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do cliente").max(200).optional(),
  cpf: campo.refine((v) => !v || v.replace(/\D/g, "").length === 11, "CPF deve ter 11 números"),
  telefone: campo,
  email: campo.refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "E-mail inválido"),
  endereco: campo,
  dataNascimento: campo.refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data de nascimento inválida"),
  estadoCivil: campo,
  cep: campo,
  cidadeUf: campo,
  origem: campo,
});

export const fichaPatchSchema = z.object({
  empresa: z.string().trim().max(300).nullable().optional(),
  advogadoChave: z.string().trim().max(200).nullable().optional(),
  recebimentoId: z.string().max(100).nullable().optional(),
  dados: fichaDadosSchema.optional(),
  cliente: fichaClienteSchema.optional(),
  acao: z.literal("enviar").optional(),
  /** Só atualiza as provas pedidas, sem mexer no resto da ficha. */
  provasPedidas: z.array(z.string().max(100)).max(50).optional(),
});

/** Só os campos que vieram, prontos para o `update` do cliente. */
export function dadosDoClientePelaFicha(c: z.infer<typeof fichaClienteSchema>): Prisma.ClienteUpdateInput {
  const out: Prisma.ClienteUpdateInput = {};
  for (const [k, v] of Object.entries(c)) {
    if (v === undefined) continue;
    if (k === "dataNascimento") out.dataNascimento = v ? dataParaDb(v) : null;
    else (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export type FichaSerializada = {
  id: string;
  clienteId: string;
  advogadoChave: string | null;
  empresa: string | null;
  situacao: "RASCUNHO" | "ENVIADA";
  dados: FichaDados;
  recebimentoId: string | null;
  enviadaEm: string | null;
  criadaEm: string;
  atualizadaEm: string;
};

export function serializarFicha(f: Prisma.FichaGetPayload<object>): FichaSerializada {
  const dados = fichaDadosSchema.safeParse(f.dados);
  return {
    id: f.id,
    clienteId: f.clienteId,
    advogadoChave: f.advogadoChave,
    empresa: f.empresa,
    situacao: f.situacao,
    dados: dados.success ? dados.data : {},
    recebimentoId: f.recebimentoId,
    enviadaEm: f.enviadaEm ? f.enviadaEm.toISOString() : null,
    criadaEm: dataDoDb(f.createdAt),
    atualizadaEm: f.updatedAt.toISOString(),
  };
}

type Aviso = { title: string; body: string; url: string; tag: string };

/** Aviso na hora para os aparelhos dos usuários escolhidos. Falha no envio não impede o resto. */
export async function avisarUsuarios(quem: Prisma.UsuarioWhereInput, n: Aviso): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return 0;
  webpush.setVapidDetails("mailto:carlos@ferreirarocha.adv.br", publicKey, privateKey);
  const aparelhos = await prisma.pushSubscription.findMany({ where: { usuario: { ativo: true, ...quem } } });
  let enviados = 0;
  const expirados: string[] = [];
  await Promise.all(
    aparelhos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(n), { TTL: 24 * 60 * 60 });
        enviados++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expirados.push(a.id);
        else console.error("[push] falha", status, err);
      }
    }),
  );
  if (expirados.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: expirados } } });
  return enviados;
}

/** Aviso para os logins do advogado (pela chave do nome). */
export function avisarAdvogado(chave: string, n: Aviso): Promise<number> {
  return avisarUsuarios({ perfil: "ADVOGADO", advogadoChave: { equals: chaveAdvogado(chave), mode: "insensitive" } }, n);
}
