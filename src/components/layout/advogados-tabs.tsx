"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Alterna entre Audiências e Petições (os dois tipos de pagamento a advogados). */
export function AdvogadosTabs() {
  const pathname = usePathname();
  const abas = [
    { href: "/audiencias", label: "Audiências" },
    { href: "/peticoes", label: "Petições" },
  ];
  return (
    <nav className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 sm:inline-grid sm:w-80" aria-label="Advogados">
      {abas.map((a) => {
        const ativo = pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors",
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
