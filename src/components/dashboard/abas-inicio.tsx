"use client";

import Link from "next/link";
import { Briefcase, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { COOKIE_ABA_INICIO, type AbaInicio } from "@/lib/inicio";


const ABAS: { id: AbaInicio; rotulo: string; icone: typeof Wallet }[] = [
  { id: "escritorio", rotulo: "Escritório", icone: Briefcase },
  { id: "financeiro", rotulo: "Financeiro", icone: Wallet },
];

/** Abas do Início do dono. Guarda a escolhida num cookie para abrir nela da próxima vez. */
export function AbasInicio({ ativa }: { ativa: AbaInicio }) {
  return (
    <nav role="tablist" aria-label="Início" className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
      {ABAS.map(({ id, rotulo, icone: Icone }) => (
        <Link
          key={id}
          href={`/?aba=${id}`}
          role="tab"
          aria-selected={ativa === id}
          onClick={() => {
            document.cookie = `${COOKIE_ABA_INICIO}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
            ativa === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icone className="h-4 w-4" /> {rotulo}
        </Link>
      ))}
    </nav>
  );
}
