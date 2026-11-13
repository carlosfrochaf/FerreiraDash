"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Scale, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NotificationBell } from "./notification-bell";
import { barraDoPerfil, itemAtivo, secoesDoPerfil, type ItemMenu } from "./menu";
import { rotuloPerfil, type Perfil } from "@/lib/perfis";

export function AppShell({ children, usuario }: { children: React.ReactNode; usuario: { nome: string; perfil: Perfil } | null }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);

  // Fecha o "Mais" ao trocar de tela.
  useEffect(() => setMaisAberto(false), [pathname]);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" }).catch(() => {});
    window.location.replace("/login");
  }

  // A tela de login aparece sem cabeçalho e sem menu.
  if (pathname === "/login" || !usuario) {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
  }

  const secoes = secoesDoPerfil(usuario.perfil);
  const todos: ItemMenu[] = secoes.flatMap((s) => s.itens);
  const hrefsBarra = barraDoPerfil(usuario.perfil);
  const barra = hrefsBarra.map((h) => todos.find((i) => i.href === h)).filter((i): i is ItemMenu => !!i);
  const noMais = todos.filter((i) => !hrefsBarra.includes(i.href));
  const maisAtivo = noMais.some((i) => itemAtivo(pathname, i.href));

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{APP_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">Financeiro Jurídico</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="mr-1 hidden text-right sm:block">
              <p className="max-w-40 truncate text-xs font-semibold leading-tight">{usuario.nome}</p>
              <p className="text-[11px] text-muted-foreground">{rotuloPerfil(usuario.perfil)}</p>
            </div>
            <NotificationBell />
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

      <div className="flex flex-1">
        {/* Menu lateral (computador) */}
        <nav aria-label="Principal" className="sticky top-[61px] hidden h-[calc(100dvh-61px)] w-56 shrink-0 overflow-y-auto border-r border-border/60 px-3 py-4 md:block">
          {secoes.map((s, i) => (
            <div key={i} className="mb-3">
              {s.titulo && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.titulo}</p>}
              {s.itens.map((item) => {
                const Icon = item.icon;
                const ativo = itemAtivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      ativo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 md:px-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* "Mais" no celular: painel que sobe por cima da barra */}
      {maisAberto && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMaisAberto(false)}>
          <div
            className="safe-area-pb absolute bottom-[64px] left-0 right-0 rounded-t-2xl border-t border-border bg-card p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-semibold">Mais</p>
              <button onClick={() => setMaisAberto(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {noMais.map((item) => {
                const Icon = item.icon;
                const ativo = itemAtivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-medium",
                      ativo ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barra de baixo (celular) */}
      <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md md:hidden" aria-label="Principal">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-0.5 px-1.5 pt-2">
          {barra.map((item) => {
            const Icon = item.icon;
            const ativo = itemAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium transition-colors",
                  ativo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMaisAberto((v) => !v)}
            aria-expanded={maisAberto}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium transition-colors",
              maisAberto || maisAtivo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
