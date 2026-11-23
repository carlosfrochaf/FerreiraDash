import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detalharDocumento, linkDoArquivo } from "@/lib/zapsign";
import { configZapsign } from "@/lib/zapsign-servico";

/** Abre um PDF assinado: pede ao ZapSign o link atual (o anterior vence) e redireciona. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const z = configZapsign();
  if (!z) return NextResponse.json({ error: "ZapSign não configurado." }, { status: 503 });
  const { id } = await params;
  const arquivo = new URL(request.url).searchParams.get("arquivo") ?? "";
  const c = await prisma.contratoAssinado.findUnique({ where: { id }, select: { docToken: true } });
  if (!c) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  try {
    const link = linkDoArquivo(await detalharDocumento(z.token, c.docToken), arquivo);
    if (!link) return NextResponse.json({ error: "Arquivo não encontrado no ZapSign." }, { status: 404 });
    return NextResponse.redirect(link);
  } catch (e) {
    console.error("[contratos arquivo]", e);
    return NextResponse.json({ error: "O ZapSign não respondeu agora. Tente de novo." }, { status: 502 });
  }
}
