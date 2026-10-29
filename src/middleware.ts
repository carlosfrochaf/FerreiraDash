import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getAppPassword, tokenValido } from "@/lib/auth";

// Rotas liberadas sem senha. O cron de notificações tem proteção própria (CRON_SECRET).
const ROTAS_PUBLICAS = ["/login", "/api/login", "/api/push/send-notifications"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (ROTAS_PUBLICAS.includes(pathname)) return NextResponse.next();

  if (!getAppPassword()) {
    // Em desenvolvimento, sem senha configurada, o app fica aberto.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("APP_PASSWORD não configurada no servidor.", { status: 503 });
  }

  if (await tokenValido(request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Tudo, menos arquivos estáticos do Next e os arquivos do PWA (ícones, manifest, service worker).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|manifest.json|sw.js).*)",
  ],
};
