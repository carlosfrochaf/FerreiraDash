"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, HandCoins, Scale, Settings2, History, LogOut, CalendarClock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NotificationBell } from "./notification-bell";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos/novo", label: "Lançar", icon: PlusCircle },
  { href: "/recebimentos", label: "Recebimentos", icon: HandCoins },
  { href: "/audiencias", label: "Advogados", icon: CalendarClock, tambem: "/peticoes" },
  { href: "/despesas", label: "Despesas", icon: Wallet },
];

function ativo(pathname: string, href: string, tambem?: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href) || (!!tambem && pathname.startsWith(tambem));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" }).catch(() => {});
    window.location.replace("/login");
  }

  // A tela de login aparece sem cabeçalho e sem menu.
  if (pathname === "/login") {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{APP_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">Financeiro Jurídico</p>
            </div>
          </Link>

          {/* Navegação no computador */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo(pathname, item.href, "tambem" in item ? item.tambem : undefined) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  ativo(pathname, item.href, "tambem" in item ? item.tambem : undefined) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationBell />
            <Link
              href="/historico"
              aria-current={pathname.startsWith("/historico") ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                pathname.startsWith("/historico")
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title="Histórico"
              aria-label="Histórico"
            >
              <History className="h-4 w-4" />
            </Link>
            <Link
              href="/categorias"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Categorias e ajustes"
              aria-label="Categorias e ajustes"
            >
              <Settings2 className="h-4 w-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 md:pb-10">
        {children}
      </main>

      {/* Navegação no celular */}
      <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md md:hidden" aria-label="Principal">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-0.5 px-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAtivo = ativo(pathname, item.href, "tambem" in item ? item.tambem : undefined);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isAtivo ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium transition-colors",
                  isAtivo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
