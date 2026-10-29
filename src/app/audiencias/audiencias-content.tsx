"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { hojeSaoPaulo } from "@/lib/datas";
import type { AudienciaSerializada } from "@/lib/audiencias";
import { AudienciaItem } from "@/components/audiencias/audiencia-lista";
import { AudienciaModal } from "@/components/audiencias/audiencia-modal";

type Aba = "proximas" | "apagar" | "pagas" | "todas";

export function AudienciasContent({ audiencias }: { audiencias: AudienciaSerializada[] }) {
  const [aba, setAba] = useState<Aba>("proximas");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<AudienciaSerializada | null>(null);
  const hoje = hojeSaoPaulo();

  const grupos = useMemo(() => {
    const proximas = audiencias
      .filter((a) => a.data >= hoje)
      .sort((x, y) => (x.data + (x.hora ?? "")).localeCompare(y.data + (y.hora ?? "")));
    const apagar = audiencias.filter((a) => a.data < hoje && a.statusPagamento === "PENDENTE");
    const pagas = audiencias.filter((a) => a.statusPagamento === "PAGO");
    return { proximas, apagar, pagas, todas: audiencias };
  }, [audiencias, hoje]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos[aba];
    return grupos[aba].filter((a) => [a.clienteNome, a.reclamada, a.advogadoNome, a.processoNumero].some((t) => t?.toLowerCase().includes(q)));
  }, [grupos, aba, busca]);

  const totalAPagar = grupos.apagar.reduce((s, a) => s + Number(a.valor ?? 0), 0);

  const abas: { id: Aba; label: string; n: number }[] = [
    { id: "proximas", label: "Próximas", n: grupos.proximas.length },
    { id: "apagar", label: "A pagar", n: grupos.apagar.length },
    { id: "pagas", label: "Pagas", n: grupos.pagas.length },
    { id: "todas", label: "Todas", n: grupos.todas.length },
  ];

  return (
    <div className="space-y-4">
      {grupos.apagar.length > 0 && (
        <button
          onClick={() => setAba("apagar")}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-left"
        >
          <span className="text-sm">
            <strong>{grupos.apagar.length}</strong> {grupos.apagar.length === 1 ? "audiência a pagar" : "audiências a pagar"} aos advogados
          </span>
          <span className="font-bold tabular-nums text-rose-300">{formatCurrency(totalAPagar)}</span>
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente, empresa, advogado ou processo" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 pl-10" />
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
              {t.label} <span className="text-xs opacity-70">{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {audiencias.length === 0 ? "Nenhuma audiência cadastrada ainda." : "Nada nesta lista."}
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((a) => (
            <AudienciaItem key={a.id} a={a} modo={aba === "proximas" ? "proximas" : "todas"} onClick={() => setSel(a)} />
          ))}
        </div>
      )}

      <AudienciaModal audiencia={sel} onFechar={() => setSel(null)} />
    </div>
  );
}
