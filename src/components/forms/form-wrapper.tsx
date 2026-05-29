"use client";

import { useState } from "react";
import { PlusCircle, CalendarDays } from "lucide-react";
import { LancamentoForm } from "./lancamento-form";
import { AcordoForm } from "./acordo-form";
import { cn } from "@/lib/utils";

type Props = {
  processos: any[];
  contatos: any[];
  categorias: any[];
  transacaoEdicao?: any;
};

export function FormWrapper({ processos, contatos, categorias, transacaoEdicao }: Props) {
  const [activeTab, setActiveTab] = useState<"single" | "acordo">("single");

  // Se estiver editando, força apenas o formulário de lançamento único sem mostrar abas
  if (transacaoEdicao) {
    return (
      <LancamentoForm
        processos={processos}
        contatos={contatos}
        categorias={categorias}
        transacaoEdicao={transacaoEdicao}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Abas Glassmórficas Premium */}
      <div className="flex w-full max-w-sm rounded-xl bg-card border border-border/60 p-1.5 shadow-md">
        <button
          onClick={() => setActiveTab("single")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer",
            activeTab === "single"
              ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <PlusCircle className="h-4 w-4" />
          Lançamento Simples
        </button>
        <button
          onClick={() => setActiveTab("acordo")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer",
            activeTab === "acordo"
              ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Acordo Parcelado
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "single" ? (
          <LancamentoForm
            processos={processos}
            contatos={contatos}
            categorias={categorias}
          />
        ) : (
          <AcordoForm
            processos={processos}
            contatos={contatos}
            categorias={categorias}
          />
        )}
      </div>
    </div>
  );
}
