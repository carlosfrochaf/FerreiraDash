import { z } from "zod";
import { prisma } from "./prisma";
import { MODELOS_PADRAO } from "./mensagens";

export type ModeloSerializado = { id: string; nome: string; momento: "ANTES_CONTRATO" | "DEPOIS_CONTRATO" | "AUDIENCIA" | "SEMPRE"; texto: string };

export const modeloSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à mensagem.").max(80),
  momento: z.enum(["ANTES_CONTRATO", "DEPOIS_CONTRATO", "AUDIENCIA", "SEMPRE"]),
  texto: z.string().trim().min(1, "Escreva o texto da mensagem.").max(3000),
});

/** Modelos do escritório; na primeira vez, grava os que o app já traz. */
export async function listarModelos(): Promise<ModeloSerializado[]> {
  if ((await prisma.modeloMensagem.count()) === 0) {
    await prisma.modeloMensagem.createMany({ data: MODELOS_PADRAO.map((m, i) => ({ ...m, ordem: i })) });
  }
  const l = await prisma.modeloMensagem.findMany({ orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] });
  return l.map((m) => ({ id: m.id, nome: m.nome, momento: m.momento, texto: m.texto }));
}
