import { prisma } from "./prisma";
import { chaveAdvogado } from "./advogado-chave";

export { chaveAdvogado };

/** Pix de todos os advogados: chave → Pix. */
export async function pixDosAdvogados(): Promise<Record<string, string>> {
  const lista = await prisma.advogado.findMany({ where: { pix: { not: null } }, select: { chave: true, pix: true } });
  return Object.fromEntries(lista.map((a) => [a.chave, a.pix!]));
}

/**
 * Grava o Pix do advogado (vale para todas as audiências e petições dele).
 * `pix` undefined: não mexe; string vazia: apaga.
 */
export async function salvarPixAdvogado(nome: string, pix: string | undefined) {
  if (pix === undefined) return;
  const valor = pix.trim() || null;
  const chave = chaveAdvogado(nome);
  if (!chave) return;
  await prisma.advogado.upsert({
    where: { chave },
    update: { pix: valor, nome: nome.trim() },
    create: { chave, nome: nome.trim(), pix: valor },
  });
}
