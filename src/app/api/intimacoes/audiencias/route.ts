import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hojeSaoPaulo } from "@/lib/datas";
import { audienciasDoPassado, lancarAudienciaDaIntimacao } from "@/lib/intimacoes-servico";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lança as audiências futuras citadas nas intimações. ?simular=1 só mostra o que lançaria.
 * Sem ?meses: passa as intimações já gravadas. Com ?meses=N (até 12): busca as publicações dos últimos N meses.
 * Seguro para repetir: mesmo processo e mesma data não entram duas vezes.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const simular = url.searchParams.has("simular");
  const meses = Math.min(12, Math.max(0, Number(url.searchParams.get("meses")) || 0));

  if (meses > 0) {
    try {
      return NextResponse.json({ simular, meses, ...(await audienciasDoPassado(hojeSaoPaulo(), meses, simular)) });
    } catch (e) {
      console.error("[audiencias do passado]", e);
      return NextResponse.json({ error: "A busca no Diário de Justiça falhou. Tente de novo." }, { status: 502 });
    }
  }

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
