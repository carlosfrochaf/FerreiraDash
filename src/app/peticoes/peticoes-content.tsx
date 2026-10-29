"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { PeticaoSerializada } from "@/lib/peticoes";
import { PeticaoItem, PeticaoModal } from "@/components/peticoes/peticao-ui";

type Aba = "A_VALIDAR" | "A_PAGAR" | "PAGA" | "TODAS";

export function PeticoesContent({ peticoes }: { peticoes: PeticaoSerializada[] }) {
  const [aba, setAba] = useState<Aba>(() => (peticoes.some((p) => p.status === "A_VALIDAR") ? "A_VALIDAR" : "A_PAGAR"));
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<PeticaoSerializada | null>(null);

  const contagem = useMemo(() => {
    const c = { A_VALIDAR: 0, A_PAGAR: 0, PAGA: 0, TODAS: peticoes.length };
    for (const p of peticoes) c[p.status]++;
    return c;
  }, [peticoes]);

  const aPagarTotal = peticoes.filter((p) => p.status !== "PAGA").reduce((s, p) => s + Number(p.valor ?? 0), 0);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return peticoes.filter((p) => {
      if (aba !== "TODAS" && p.status !== aba) return false;
      if (!q) return true;
      return [p.clienteNome, p.reclamada, p.advogadoNome, p.descricao, p.processoNumero].some((t) => t?.toLowerCase().includes(q));
    });
  }, [peticoes, aba, busca]);

  const abas: { id: Aba; label: string }[] = [
    { id: "A_VALIDAR", label: "Falta validar" },
    { id: "A_PAGAR", label: "A pagar" },
    { id: "PAGA", label: "Pagas" },
    { id: "TODAS", label: "Todas" },
  ];

  return (
    <div className="space-y-4">
      {aPagarTotal > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
          <span className="text-sm">Ainda não pago aos advogados</span>
          <span className="font-bold tabular-nums text-rose-300">{formatCurrency(aPagarTotal)}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente, advogado, petição..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1" role="tablist">
          {abas.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={aba === t.id}
              onClick={() => setAba(t.id)}
              className={cn(
                "flex-1 shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                aba === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} <span className="text-xs opacity-70">{contagem[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {peticoes.length === 0 ? "Nenhuma petição cadastrada ainda." : "Nada nesta lista."}
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => (
            <PeticaoItem key={p.id} p={p} onClick={() => setSel(p)} />
          ))}
        </div>
      )}

      <PeticaoModal peticao={sel} onFechar={() => setSel(null)} />
    </div>
  );
}
