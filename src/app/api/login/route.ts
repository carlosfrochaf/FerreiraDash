import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, gerarTokenSessao, getAppPassword, senhaCorreta } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const senha = getAppPassword();
  if (!senha) {
    return NextResponse.json({ error: "APP_PASSWORD não configurada no servidor." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const tentativa = typeof body?.senha === "string" ? body.senha : "";

  if (!(await senhaCorreta(tentativa))) {
    // Atraso fixo para dificultar tentativas em massa.
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, await gerarTokenSessao(senha), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
