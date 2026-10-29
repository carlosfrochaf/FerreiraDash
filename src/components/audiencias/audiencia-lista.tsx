"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { diasAte, formatarDataCurta } from "@/lib/datas";
import type { AudienciaSerializada } from "@/lib/audiencias";
import { AudienciaModal } from "./audiencia-modal";

type Props = {
  titulo: string;
  descricao: string;
  modo: "proximas" | "apagar";
  itens: AudienciaSerializada[];
  vazio: string;
};

function quando(data: string) {
  const d = diasAte(data);
  if (d === 0) return { texto: "Hoje", cor: "bg-sky-500/15 text-sky-300 ring-sky-500/30" };
  if (d === 1) return { texto: "Amanhã", cor: "bg-sky-500/10 text-sky-300 ring-sky-500/20" };
  if (d > 1 && d <= 7) return { texto: `Em ${d} dias`, cor: "bg-muted text-muted-foreground ring-border" };
  if (d < 0) return { texto: `Há ${-d}d`, cor: "bg-muted text-muted-foreground ring-border" };
  return null;
}

export function AudienciaLista({ titulo, descricao, modo, itens, vazio }: Props) {
  const [sel, setSel] = useState<AudienciaSerializada | null>(null);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{titulo}</CardTitle>
            <p className="text-xs text-muted-foreground">{descricao}</p>
          </div>
          <Link href="/audiencias" className="flex shrink-0 items-center text-xs font-medium text-primary hover:underline">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="max-h-[22rem] flex-1 space-y-2 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{vazio}</p>
          ) : (
            itens.map((a) => <AudienciaItem key={a.id} a={a} modo={modo} onClick={() => setSel(a)} />)
          )}
        </CardContent>
      </Card>
      <AudienciaModal audiencia={sel} onFechar={() => setSel(null)} />
    </>
  );
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
