// Quem está logado, conferido no banco (ativo e versão da sessão). Só no servidor.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { AUTH_COOKIE, lerSessao, segredoSessao } from "./sessao";
import { podeUsarApi, type Perfil } from "./perfis";

export type UsuarioLogado = { id: string; nome: string; perfil: Perfil; advogadoChave: string | null };

async function carregar(token: string | undefined): Promise<UsuarioLogado | null> {
  const segredo = segredoSessao();
  const s = segredo ? await lerSessao(token, segredo) : null;
  if (!s) return null;
  const u = await prisma.usuario.findUnique({ where: { id: s.id } });
  if (!u || !u.ativo || u.versaoSessao !== s.versao || u.perfil !== s.perfil) return null;
  return { id: u.id, nome: u.nome, perfil: u.perfil, advogadoChave: u.advogadoChave };
}

/** Para páginas: sem sessão válida, sai (limpa o cookie) e vai ao login. */
export async function usuarioAtual(): Promise<UsuarioLogado> {
  const u = await carregar((await cookies()).get(AUTH_COOKIE)?.value);
  if (!u) redirect("/api/login/sair");
  return u;
}

/** Para o layout: null quando não há cookie (tela de login). */
export async function usuarioOpcional(): Promise<UsuarioLogado | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const u = await carregar(token);
  if (!u) redirect("/api/login/sair");
  return u;
}

/** Para rotas da API: devolve o usuário ou a resposta de erro (401/403). */
export async function exigirPerfilApi(request: Request): Promise<UsuarioLogado | NextResponse> {
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\s*)${AUTH_COOKIE}=([^;]+)`))?.[1];
  const u = await carregar(token ? decodeURIComponent(token) : undefined);
  if (!u) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!podeUsarApi(u.perfil, request.method, new URL(request.url).pathname)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  return u;
}
