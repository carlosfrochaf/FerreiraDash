import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { segredoSessao } from "@/lib/sessao";
import { hashSenha } from "@/lib/senha";
import { lerLinkSenha } from "@/lib/link-senha";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({ t: z.string().max(500), senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(200) });
const VENCIDO = "Este link venceu ou já foi usado. Peça um novo em \"Esqueci minha senha\".";

/** Troca a senha pelo link do e-mail. Sobe a versão da sessão: o link morre e os acessos antigos caem. */
export async function POST(request: Request) {
  const segredo = segredoSessao();
  const corpo = corpoSchema.safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return NextResponse.json({ error: corpo.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const link = segredo ? await lerLinkSenha(corpo.data.t, segredo) : null;
  const u = link ? await prisma.usuario.findUnique({ where: { id: link.id } }) : null;
  if (!link || !u || !u.ativo || u.versaoSessao !== link.versao) return NextResponse.json({ error: VENCIDO }, { status: 400 });

  // Só troca se a versão ainda for a do link (dois cliques ao mesmo tempo não trocam duas vezes).
  const r = await prisma.usuario.updateMany({
    where: { id: u.id, versaoSessao: link.versao },
    data: { senhaHash: await hashSenha(corpo.data.senha), versaoSessao: { increment: 1 }, linkSenhaEm: null },
  });
  if (r.count === 0) return NextResponse.json({ error: VENCIDO }, { status: 400 });
  return NextResponse.json({ ok: true });
}
