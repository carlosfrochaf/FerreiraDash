import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE } from "@/lib/sessao";
import { conferirSenha } from "@/lib/senha";
import { cookieDeSessao } from "@/lib/usuarios";
import { loginSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corpo = loginSchema.safeParse(await request.json().catch(() => ({})));
  const u = corpo.success ? await prisma.usuario.findUnique({ where: { email: corpo.data.email } }) : null;
  const ok = !!u && u.ativo && corpo.success && (await conferirSenha(corpo.data.senha, u.senhaHash));
  if (!ok || !u) {
    // Atraso fixo para dificultar tentativas em massa.
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  await cookieDeSessao(res, u);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
