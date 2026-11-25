import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { conferirSenha, hashSenha } from "@/lib/senha";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { cookieDeSessao } from "@/lib/usuarios";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  atual: z.string().min(1, "Digite a senha atual.").max(200),
  nova: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres.").max(200),
});

/** A própria pessoa troca a senha. Os outros aparelhos dela saem; este continua entrado. */
export async function POST(request: Request) {
  const eu = await exigirPerfilApi(request);
  if (eu instanceof NextResponse) return eu;
  const corpo = corpoSchema.safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return NextResponse.json({ error: corpo.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const u = await prisma.usuario.findUnique({ where: { id: eu.id } });
  if (!u || !(await conferirSenha(corpo.data.atual, u.senhaHash))) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "A senha atual não confere." }, { status: 400 });
  }
  const novo = await prisma.usuario.update({
    where: { id: u.id },
    data: { senhaHash: await hashSenha(corpo.data.nova), versaoSessao: { increment: 1 } },
  });
  const res = NextResponse.json({ ok: true });
  await cookieDeSessao(res, novo);
  return res;
}
