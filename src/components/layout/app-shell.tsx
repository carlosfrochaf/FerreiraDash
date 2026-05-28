"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, ArrowLeftRight, Scale, FolderEdit, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos/novo", label: "Lançamento", icon: PlusCircle },
  { href: "/repasse", label: "Repasse", icon: ArrowLeftRight },
  { href: "/historico", label: "Histórico", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Financeiro Jurídico</p>
            </div>
          </div>

          <Link
            href="/categorias"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <FolderEdit className="h-3.5 w-3.5" />
            <span>Categorias</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 py-2">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.split("?")[0]);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
