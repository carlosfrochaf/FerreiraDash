"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { diasAte, formatarDataCurta } from "@/lib/datas";
import { proximoMes } from "@/lib/recorrencias";
import { TIPOS_DESPESA, separarPorStatus, type ItemDespesa, type ResumoDespesas, type TipoDespesa } from "@/lib/despesas";

function mesAnterior(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, "0")}`;
}

function nomeDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  const nome = new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function DespesasContent({ mes, resumo }: { mes: string; resumo: ResumoDespesas }) {
  const [filtro, setFiltro] = useState<TipoDespesa | null>(null);
  const itens = filtro ? resumo.itens.filter((i) => i.tipoDespesa === filtro) : resumo.itens;
  const blocos = separarPorStatus(itens);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2">
        <Link
          href={`/despesas?mes=${mesAnterior(mes)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="font-semibold">{nomeDoMes(mes)}</p>
        <Link
          href={`/despesas?mes=${proximoMes(mes)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">Total</p>
          <p className="text-sm font-bold tabular-nums text-rose-300 sm:text-lg">{formatCurrency(resumo.total)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">Pago</p>
          <p className="text-sm font-bold tabular-nums text-emerald-300 sm:text-lg">{formatCurrency(resumo.pago)}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">Falta pagar</p>
          <p className="text-sm font-bold tabular-nums text-amber-300 sm:text-lg">{formatCurrency(resumo.falta)}</p>
        </div>
      </div>

      <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
        {TIPOS_DESPESA.map((t) => {
          const dados = resumo.porTipo[t.id];
          const ativo = filtro === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFiltro(ativo ? null : t.id)}
              aria-pressed={ativo}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent",
                ativo && "bg-primary/10"
              )}
            >
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", ativo && "text-primary")}>{t.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {dados.quantidade === 0 ? "Nenhuma" : dados.quantidade === 1 ? "1 despesa" : `${dados.quantidade} despesas`}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{formatCurrency(dados.total)}</span>
            </button>
          );
        })}
      </div>
      {filtro && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Mostrando só {TIPOS_DESPESA.find((t) => t.id === filtro)?.label.toLowerCase()}.{" "}
          <button type="button" className="font-semibold text-primary" onClick={() => setFiltro(null)}>
            Ver todas
          </button>
        </p>
      )}

      {itens.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Receipt className="mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">Nenhuma despesa neste mês.</p>
        </div>
      ) : (
        <div className="space-y-6 pb-6">
          {blocos.pendentes.length === 0 ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-sm font-semibold text-emerald-300">
              Tudo pago neste mês 🎉
            </p>
          ) : (
            <Bloco titulo="Falta pagar" cor="text-amber-300" itens={blocos.pendentes} total={blocos.totalPendentes} />
          )}
          {blocos.pagos.length > 0 && (
            <Bloco titulo="Pagos" cor="text-emerald-300" itens={blocos.pagos} total={blocos.totalPagos} />
          )}
        </div>
      )}
    </div>
  );
}

/** Um bloco da lista ("Falta pagar" ou "Pagos"), com quantidade e total no título. */
function Bloco({ titulo, cor, itens, total }: { titulo: string; cor: string; itens: ItemDespesa[]; total: number }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline justify-between gap-2 px-1">
        <span className={cn("text-sm font-bold uppercase tracking-wide", cor)}>
          {titulo} <span className="font-medium text-muted-foreground">· {itens.length}</span>
        </span>
        <span className={cn("text-sm font-bold tabular-nums", cor)}>{formatCurrency(total)}</span>
      </h2>
      {itens.map((m) => {
        const pendente = m.status !== "PAGO";
        const atrasado = pendente && diasAte(m.data) < 0;
        return (
          <Card key={m.key} className="border-l-4 border-l-rose-500/70">
            <CardContent className="flex gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold">{m.nome}</p>
                  <p className={cn("shrink-0 text-sm font-bold tabular-nums text-rose-400", pendente && "opacity-60")}>
                    − {formatCurrency(m.valor)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">{m.categoria}</span>
                  {m.recorrente && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">Recorrente</span>
                  )}
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 font-semibold",
                      !pendente ? "bg-emerald-500/10 text-emerald-300" : atrasado ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/10 text-amber-300"
                    )}
                  >
                    {!pendente ? "Pago" : atrasado ? "Atrasado" : "Pendente"}
                  </span>
                  <span className="text-muted-foreground">{formatarDataCurta(m.data)}</span>
                </div>
                {m.descricao && m.descricao !== m.nome && (
                  <p className="truncate text-xs text-muted-foreground">{m.descricao}</p>
                )}
              </div>
              <Link
                href={m.link}
                className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-lg text-muted-foreground hover:bg-accent"
                aria-label="Abrir"
                title="Abrir"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
