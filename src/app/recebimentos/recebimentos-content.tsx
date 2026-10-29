"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Search, Send, Trash2, Gavel, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { formatarDataCurta } from "@/lib/datas";
import type { RecebimentoSerializado } from "@/lib/recebimentos";
import type { ParcelaResumo } from "@/types";
import { ParcelaModal } from "@/components/parcelas/parcela-modal";
import { PrazoBadge } from "@/components/parcelas/prazo-badge";

type Filtro = "abertas" | "concluidas" | "todas";

function concluida(r: RecebimentoSerializado) {
  return r.parcelas.every((p) => p.statusRepasse === "REPASSADO");
}

function paraResumo(r: RecebimentoSerializado, p: RecebimentoSerializado["parcelas"][number]): ParcelaResumo {
  return {
    ...p,
    totalParcelas: r.numeroParcelas,
    recebimento: { id: r.id, clienteNome: r.clienteNome, clientePix: r.clientePix, reclamada: r.reclamada, processoNumero: r.processoNumero },
  };
}

export function RecebimentosContent({ recebimentos }: { recebimentos: RecebimentoSerializado[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [selecionada, setSelecionada] = useState<ParcelaResumo | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return recebimentos.filter((r) => {
      if (filtro === "abertas" && concluida(r)) return false;
      if (filtro === "concluidas" && !concluida(r)) return false;
      if (!q) return true;
      return [r.clienteNome, r.reclamada, r.processoNumero, r.clientePix].some((t) => t?.toLowerCase().includes(q));
    });
  }, [recebimentos, busca, filtro]);

  if (recebimentos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Gavel className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">Nenhuma causa cadastrada</p>
          <p className="text-sm text-muted-foreground">Cadastre a primeira para acompanhar parcelas e repasses aqui.</p>
        </div>
        <Button asChild>
          <Link href="/lancamentos/novo?modo=causa">Cadastrar causa</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente, empresa ou processo" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 pl-10" />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1" role="tablist">
          {(
            [
              ["abertas", "Em aberto"],
              ["concluidas", "Concluídas"],
              ["todas", "Todas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filtro === id}
              onClick={() => setFiltro(id)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                filtro === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nada encontrado com esses filtros.
        </p>
      ) : (
        lista.map((r) => <CausaCard key={r.id} r={r} onParcela={(p) => setSelecionada(paraResumo(r, p))} />)
      )}

      <ParcelaModal parcela={selecionada} onFechar={() => setSelecionada(null)} />
    </div>
  );
}

function CausaCard({
  r,
  onParcela,
}: {
  r: RecebimentoSerializado;
  onParcela: (p: RecebimentoSerializado["parcelas"][number]) => void;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  const recebidas = r.parcelas.filter((p) => p.statusRecebimento === "RECEBIDO").length;
  const repassadas = r.parcelas.filter((p) => p.statusRepasse === "REPASSADO").length;
  const valorEscritorio = r.parcelas.reduce((s, p) => s + Number(p.valorEscritorio), 0);
  const valorCliente = r.parcelas.reduce((s, p) => s + Number(p.valorCliente), 0);

  function excluir() {
    setErro("");
    startTransition(async () => {
      const res = await fetch(`/api/recebimentos/${r.id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) {
        setErro("Não foi possível excluir.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-semibold">{r.clienteNome}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[r.reclamada, r.processoNumero].filter(Boolean).join(" · ") || "Sem processo vinculado"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Pix: {r.clientePix ? <span className="font-mono text-foreground/80">{r.clientePix}</span> : <span className="text-amber-300/80">não cadastrado</span>}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold tabular-nums">{formatCurrency(r.valorTotal)}</p>
            <p className="text-[11px] text-muted-foreground">{Number(r.percentualEscritorio)}% escritório</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Escritório</p>
            <p className="font-semibold tabular-nums text-emerald-300">{formatCurrency(valorEscritorio)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Cliente</p>
            <p className="font-semibold tabular-nums text-amber-200">{formatCurrency(valorCliente)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {recebidas}/{r.numeroParcelas} recebidas
            </span>
            <span>
              {repassadas}/{r.numeroParcelas} repassadas
            </span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {r.parcelas.map((p) => (
              <span
                key={p.id}
                className={cn(
                  "flex-1",
                  p.statusRepasse === "REPASSADO" ? "bg-emerald-500" : p.statusRecebimento === "RECEBIDO" ? "bg-amber-400" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
          {r.parcelas.map((p) => {
            const recebida = p.statusRecebimento === "RECEBIDO";
            const repassada = p.statusRepasse === "REPASSADO";
            return (
              <li key={p.id}>
                <button
                  onClick={() => onParcela(p)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                >
                  <span className="w-9 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                    {p.numero}/{r.numeroParcelas}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <span className="text-xs">{formatarDataCurta(p.vencimento)}</span>
                    {!recebida && <PrazoBadge vencimento={p.vencimento} />}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(p.valorParcela)}</span>
                  <span className="flex w-12 shrink-0 justify-end gap-1" aria-label={`${recebida ? "recebida" : "a receber"}, ${repassada ? "repassada" : "não repassada"}`}>
                    <Check className={cn("h-4 w-4", recebida ? "text-emerald-400" : "text-muted-foreground/30")} />
                    <Send className={cn("h-4 w-4", repassada ? "text-emerald-400" : "text-muted-foreground/30")} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2 sm:justify-between">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            <Check className="inline h-3 w-3" /> recebida da empresa · <Send className="inline h-3 w-3" /> repassada ao cliente
          </p>
          <div className="flex shrink-0 items-center gap-1">
          {!confirmando && (
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <Link href={`/recebimentos/${r.id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
          )}
          {confirmando ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" onClick={excluir} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Excluir causa
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="shrink-0 text-muted-foreground hover:text-rose-300" onClick={() => setConfirmando(true)}>
              <Trash2 /> Excluir
            </Button>
          )}
          </div>
        </div>
        {erro && <p className="text-xs text-rose-300">{erro}</p>}
      </CardContent>
    </Card>
  );
}
