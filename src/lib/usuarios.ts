// Advogados que aparecem no app (cadastro de Pix + nomes usados em audiências/petições). Só no servidor.
import { prisma } from "./prisma";

export async function advogadosConhecidos(): Promise<{ chave: string; nome: string }[]> {
  const { chaveAdvogado } = await import("./advogado-chave");
  const [cad, aud, pet] = await Promise.all([
    prisma.advogado.findMany({ select: { nome: true } }),
    prisma.audiencia.findMany({ distinct: ["advogadoNome"], select: { advogadoNome: true } }),
    prisma.peticao.findMany({ distinct: ["advogadoNome"], select: { advogadoNome: true } }),
  ]);
  const mapa = new Map<string, string>();
  for (const nome of [...cad.map((a) => a.nome), ...aud.map((a) => a.advogadoNome), ...pet.map((p) => p.advogadoNome)]) {
    const chave = chaveAdvogado(nome);
    if (chave && !mapa.has(chave)) mapa.set(chave, nome.trim());
  }
  return [...mapa].map(([chave, nome]) => ({ chave, nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
