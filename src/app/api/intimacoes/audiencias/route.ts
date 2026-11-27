import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lancarAudienciaDaIntimacao } from "@/lib/intimacoes-servico";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Passa as intimações já gravadas pelo leitor de audiência. ?simular=1 só mostra o que lançaria.
 * Seguro para repetir: mesmo processo e mesma data não entram duas vezes.
 */
export async function POST(request: Request) {
  const simular = new URL(request.url).searchParams.has("simular");
  const intimacoes = await prisma.intimacao.findMany({
    orderBy: { data: "asc" },
    select: { numeroProcesso: true, processoMascara: true, data: true, texto: true, clienteNome: true },
  });
  const lancadas = [];
  for (const i of intimacoes) {
    const a = await lancarAudienciaDaIntimacao(i, simular);
    if (a) lancadas.push({ ...a, processo: i.processoMascara ?? i.numeroProcesso });
  }
  return NextResponse.json({ simular, lancadas });
}
