"use client";

import { useState } from "react";
import { Gavel, Receipt } from "lucide-react";
import { LancamentoForm } from "./lancamento-form";
import { RecebimentoForm } from "./recebimento-form";
import { cn } from "@/lib/utils";

type ProcessoOption = { id: string; numeroPje: string; nomeAcao: string; clienteNome: string };
type ContatoOption = { id: string; nome: string; tipo: string };
type CategoriaOption = { id: string; nome: string; tipo: string };

type Props = {
  processos: ProcessoOption[];
  contatos: ContatoOption[];
  categorias: CategoriaOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transacaoEdicao?: any;
  modoInicial?: "causa" | "simples";
};

const MODOS = [
  { id: "causa", label: "Causa / acordo", desc: "Divide em parcelas e calcula o repasse", icon: Gavel },
  { id: "simples", label: "Despesa ou entrada", desc: "Lançamento avulso", icon: Receipt },
] as const;

export function FormWrapper({ processos, contatos, categorias, transacaoEdicao, modoInicial = "causa" }: Props) {
  const [modo, setModo] = useState<"causa" | "simples">(modoInicial);

  // Edição de um lançamento existente: só o formulário simples, sem abas.
  if (transacaoEdicao) {
    return <LancamentoForm processos={processos} contatos={contatos} categorias={categorias} transacaoEdicao={transacaoEdicao} />;
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Tipo de lançamento" className="grid grid-cols-2 gap-2 sm:max-w-lg">
        {MODOS.map((m) => {
          const Icon = m.icon;
          const ativo = modo === m.id;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => setModo(m.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ativo ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", ativo ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", ativo && "text-primary")}>{m.label}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {modo === "causa" ? (
        <RecebimentoForm processos={processos} />
      ) : (
        <LancamentoForm processos={processos} contatos={contatos} categorias={categorias} />
      )}
    </div>
  );
}
