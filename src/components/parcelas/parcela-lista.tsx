"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { formatarDataCurta } from "@/lib/datas";
import type { ParcelaResumo } from "@/types";
import { ParcelaModal } from "./parcela-modal";
import { PrazoBadge } from "./prazo-badge";

type Props = {
  titulo: string;
  descricao: string;
  /** "entradas": mostra a parte do escritório. "repasses": mostra a parte do cliente. */
  modo: "entradas" | "repasses";
  itens: ParcelaResumo[];
  vazio: string;
};

export function ParcelaLista({ titulo, descricao, modo, itens, vazio }: Props) {
  const [selecionada, setSelecionada] = useState<ParcelaResumo | null>(null);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{titulo}</CardTitle>
            <p className="text-xs text-muted-foreground">{descricao}</p>
          </div>
          <Link href="/recebimentos" className="flex shrink-0 items-center text-xs font-medium text-primary hover:underline">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="max-h-[22rem] flex-1 space-y-2 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{vazio}</p>
          ) : (
            itens.map((p) => {
              const pronta = p.statusRecebimento === "RECEBIDO";
              const valor = modo === "entradas" ? p.valorEscritorio : p.valorCliente;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelecionada(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">{p.recebimento.clienteNome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.recebimento.reclamada ? `${p.recebimento.reclamada} · ` : ""}
                      {p.numero}/{p.totalParcelas}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{formatarDataCurta(p.vencimento)}</span>
                      {modo === "repasses" ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                            pronta
                              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                              : "bg-muted text-muted-foreground ring-border"
                          )}
                        >
                          {pronta ? "Pronto para repassar" : "Aguardando recebimento"}
                        </span>
                      ) : (
                        <PrazoBadge vencimento={p.vencimento} />
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      modo === "entradas" ? "text-emerald-400" : "text-amber-300"
                    )}
                  >
                    {formatCurrency(valor)}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
      <ParcelaModal parcela={selecionada} onFechar={() => setSelecionada(null)} />
    </>
  );
}
