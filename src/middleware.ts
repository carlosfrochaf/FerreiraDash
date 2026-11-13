import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, lerSessao, segredoSessao } from "@/lib/sessao";
import { podeUsarApi, podeVerTela } from "@/lib/perfis";

// Rotas liberadas sem login. O cron de notificações tem proteção própria (CRON_SECRET).
const ROTAS_PUBLICAS = ["/login", "/api/login", "/api/login/primeiro-acesso", "/api/login/sair", "/api/push/send-notifications"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (ROTAS_PUBLICAS.includes(pathname)) return NextResponse.next();

  const segredo = segredoSessao();
  if (!segredo) return new NextResponse("SESSION_SECRET não configurado no servidor.", { status: 503 });

  const api = pathname.startsWith("/api/");
  const sessao = await lerSessao(request.cookies.get(AUTH_COOKIE)?.value, segredo);
  if (!sessao) {
    if (api) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (api) {
    if (!podeUsarApi(sessao.perfil, request.method, pathname)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  } else if (!podeVerTela(sessao.perfil, pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Roda no Node para ler o SESSION_SECRET do servidor na hora (e não só no build).
  runtime: "nodejs",
  // Tudo, menos arquivos estáticos do Next e os arquivos do PWA (ícones, manifest, service worker).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|manifest.json|sw.js).*)"],
};
