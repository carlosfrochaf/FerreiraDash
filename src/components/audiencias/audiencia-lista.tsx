"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { diasAte, formatarDataCurta } from "@/lib/datas";
import type { AudienciaSerializada } from "@/lib/audiencias";

function quando(data: string) {
  const d = diasAte(data);
  if (d === 0) return { texto: "Hoje", cor: "bg-sky-500/15 text-sky-300 ring-sky-500/30" };
  if (d === 1) return { texto: "Amanhã", cor: "bg-sky-500/10 text-sky-300 ring-sky-500/20" };
  if (d > 1 && d <= 7) return { texto: `Em ${d} dias`, cor: "bg-muted text-muted-foreground ring-border" };
  if (d < 0) return { texto: `Há ${-d}d`, cor: "bg-muted text-muted-foreground ring-border" };
  return null;
}

export function AudienciaItem({ a, modo, onClick }: { a: AudienciaSerializada; modo: "proximas" | "apagar" | "todas"; onClick: () => void }) {
  const selo = modo === "proximas" ? quando(a.data) : null;
  const paga = a.statusPagamento === "PAGO";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted/50 py-1.5 text-center leading-tight">
        <span className="text-sm font-bold tabular-nums">{a.data.slice(8, 10)}</span>
        <span className="text-[10px] uppercase text-muted-foreground">{formatarDataCurta(a.data).split(" ")[1]}</span>
        {a.hora && <span className="text-[10px] tabular-nums text-muted-foreground">{a.hora}</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">
          {a.clienteNome}
          {a.reclamada ? <span className="text-muted-foreground"> × {a.reclamada}</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">Advogado: {a.advogadoNome}</p>
        {selo && (
          <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset", selo.cor)}>
            {selo.texto}
          </span>
        )}
      </div>
      {modo !== "proximas" && (
        <p className={cn("shrink-0 text-sm font-semibold tabular-nums", paga ? "text-emerald-400" : a.valor ? "text-rose-300" : "text-muted-foreground")}>
          {a.valor ? formatCurrency(a.valor) : "Definir valor"}
        </p>
      )}
    </button>
  );
}
