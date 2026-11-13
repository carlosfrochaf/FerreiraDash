import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { lerZapsign, processarAssinatura } from "@/lib/zapsign-servico";

// Rota pública: o ZapSign chama aqui quando alguém assina. Protegida pelo segredo no cabeçalho.
export async function POST(request: Request) {
  const z = await lerZapsign();
  if (!z) return NextResponse.json({ ok: true, ignorado: "integração desligada" });

  const veio = Buffer.from(request.headers.get("x-webhook-secret") ?? "");
  const esperado = Buffer.from(z.segredo);
  if (veio.length !== esperado.length || !timingSafeEqual(veio, esperado)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const docToken = typeof corpo?.token === "string" && /^[\w-]{8,100}$/.test(corpo.token) ? corpo.token : null;
  if (!docToken) return NextResponse.json({ error: "Documento não informado." }, { status: 400 });

  try {
    const r = await processarAssinatura(z.token, docToken);
    return NextResponse.json({ ok: true, ...r });
  } catch (error) {
    console.error("[POST /api/integracoes/zapsign/aviso]", error);
    // 500 faz o ZapSign tentar de novo mais tarde.
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
