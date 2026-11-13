import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Sessão vencida ou usuário desativado: limpa o cookie e volta ao login. */
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
