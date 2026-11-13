// Usuários no banco e o cookie de sessão. Só no servidor.
import type { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { AUTH_COOKIE, AUTH_MAX_AGE, assinarSessao, segredoSessao } from "./sessao";
import type { Perfil } from "./perfis";

export { normalizarEmail, mudancaPermitida } from "./usuarios-regras";

export async function existeUsuario(): Promise<boolean> {
  return (await prisma.usuario.count()) > 0;
}

export async function cookieDeSessao(res: NextResponse, u: { id: string; perfil: Perfil; versaoSessao: number }) {
  const segredo = segredoSessao();
  if (!segredo) throw new Error("SESSION_SECRET não configurado no servidor.");
  res.cookies.set(AUTH_COOKIE, await assinarSessao({ id: u.id, perfil: u.perfil, versao: u.versaoSessao }, segredo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
}

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  advogadoChave: string | null;
  ativo: boolean;
};

export function serializarUsuario(u: UsuarioPublico): UsuarioPublico {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, advogadoChave: u.advogadoChave, ativo: u.ativo };
}
