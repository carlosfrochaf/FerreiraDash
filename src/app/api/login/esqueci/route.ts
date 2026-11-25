import { after, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { segredoSessao } from "@/lib/sessao";
import { normalizarEmail } from "@/lib/usuarios";
import { emailConfigurado, enviarEmail } from "@/lib/email";
import { assinarLinkSenha, emailNovaSenha, INTERVALO_LINK_MS } from "@/lib/link-senha";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** A tela pergunta se dá para mandar e-mail (senão, manda falar com o dono). */
export async function GET() {
  return NextResponse.json({ configurado: emailConfigurado() });
}

/** Manda o link de nova senha. Responde sempre igual, para não revelar quem tem acesso. */
export async function POST(request: Request) {
  const segredo = segredoSessao();
  if (!emailConfigurado() || !segredo) return NextResponse.json({ error: "Peça ao dono do escritório para trocar sua senha." }, { status: 503 });
  const corpo = z.object({ email: z.string().max(200) }).safeParse(await request.json().catch(() => ({})));
  const email = corpo.success ? normalizarEmail(corpo.data.email) : "";
  const origem = new URL(request.url).origin;
  // Tudo depois de responder: o tempo de resposta é igual exista ou não o e-mail.
  if (email) after(() => mandarLink(email, origem, segredo).catch((err) => console.error("[esqueci senha] envio falhou", err)));
  return NextResponse.json({ ok: true });
}

async function mandarLink(email: string, origem: string, segredo: string) {
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u?.ativo) return;
  // Marca o envio numa só operação: pedidos ao mesmo tempo não passam juntos pelo limite de 2 minutos.
  const agora = new Date();
  const limite = new Date(agora.getTime() - INTERVALO_LINK_MS);
  const marcou = await prisma.usuario.updateMany({
    where: { id: u.id, OR: [{ linkSenhaEm: null }, { linkSenhaEm: { lte: limite } }] },
    data: { linkSenhaEm: agora },
  });
  if (marcou.count !== 1) return;
  const token = await assinarLinkSenha({ id: u.id, versao: u.versaoSessao }, segredo);
  const e = emailNovaSenha(APP_NAME, u.nome.split(" ")[0], `${origem}/login/nova-senha?t=${encodeURIComponent(token)}`);
  await enviarEmail(u.email, e.assunto, e.texto, e.html);
}
