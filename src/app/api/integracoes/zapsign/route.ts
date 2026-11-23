import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cadastrarAviso } from "@/lib/zapsign";
import { configZapsign, ID_ZAPSIGN, trazerAssinados } from "@/lib/zapsign-servico";

/** Endereço público do app. */
function enderecoDoApp(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Conecta: cadastra o aviso no ZapSign para este endereço e traz os contratos já assinados (sem aviso no celular). */
export async function POST(request: Request) {
  const z = configZapsign();
  if (!z) return NextResponse.json({ error: "Falta colocar a chave ZAPSIGN_TOKEN na Vercel." }, { status: 503 });
  const url = `${enderecoDoApp(request)}/api/integracoes/zapsign/aviso`;
  const ja = await prisma.integracao.findUnique({ where: { id: ID_ZAPSIGN } });
  if (ja?.url !== url) {
    try {
      await cadastrarAviso(z.token, url, z.segredo);
    } catch (e) {
      const status = (e as { status?: number }).status;
      console.error("[zapsign conectar]", status, e);
      const msg = status === 401 || status === 403 ? "O ZapSign recusou o token. Confira a chave ZAPSIGN_TOKEN na Vercel." : "Não foi possível falar com o ZapSign agora. Tente de novo.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    await prisma.integracao.upsert({ where: { id: ID_ZAPSIGN }, create: { id: ID_ZAPSIGN, url }, update: { url, conectadoEm: new Date() } });
  }
  const trazidos = await trazerAssinados(z.token).catch((e) => {
    console.error("[zapsign] trazer assinados", e);
    return 0;
  });
  return NextResponse.json({ ok: true, trazidos });
}
