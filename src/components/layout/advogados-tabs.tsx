"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Alterna entre Audiências, Petições, Intimações e Contratos. */
export function AdvogadosTabs() {
  const pathname = usePathname();
  const abas = [
    { href: "/audiencias", label: "Audiências" },
    { href: "/peticoes", label: "Petições" },
    { href: "/intimacoes", label: "Intimações" },
    { href: "/contratos", label: "Contratos" },
  ];
  return (
    <nav className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 sm:inline-grid sm:w-[34rem]" aria-label="Advogados">
      {abas.map((a) => {
        const ativo = pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-lg px-1 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
              ativo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
