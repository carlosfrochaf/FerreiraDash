import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { fechar } from "@/lib/cifra";
import { segredoSessao } from "@/lib/sessao";
import { cadastrarAviso } from "@/lib/zapsign";
import { ID_ZAPSIGN } from "@/lib/zapsign-servico";

const conectarSchema = z.object({ token: z.string().trim().min(10, "Cole o token da API do ZapSign.").max(500) });

/** Endereço público do app (atrás do proxy do Render). */
function enderecoDoApp(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Conecta: confere o token cadastrando o aviso no ZapSign e guarda o token cifrado. Só o dono. */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const chave = segredoSessao();
  if (!chave) return NextResponse.json({ error: "Servidor sem SESSION_SECRET." }, { status: 503 });
  const parsed = conectarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Token inválido." }, { status: 400 });

  const segredo = randomBytes(24).toString("base64url");
  const url = `${enderecoDoApp(request)}/api/integracoes/zapsign/aviso`;
  try {
    await cadastrarAviso(parsed.data.token, url, segredo);
  } catch (e) {
    const status = (e as { status?: number }).status;
    const msg = status === 401 || status === 403 ? "O ZapSign recusou o token. Confira se copiou o token da API certo." : "Não foi possível falar com o ZapSign agora. Tente de novo.";
    console.error("[zapsign conectar]", status, e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  await prisma.integracao.upsert({
    where: { id: ID_ZAPSIGN },
    create: { id: ID_ZAPSIGN, tokenCifrado: fechar(parsed.data.token, chave), segredoAviso: segredo, conectadoPorId: quem.id },
    update: { tokenCifrado: fechar(parsed.data.token, chave), segredoAviso: segredo, conectadoPorId: quem.id },
  });
  return NextResponse.json({ ok: true });
}

/** Desconecta: apaga o token; avisos que chegarem depois são ignorados. */
export async function DELETE(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  await prisma.integracao.deleteMany({ where: { id: ID_ZAPSIGN } });
  return NextResponse.json({ ok: true });
}
