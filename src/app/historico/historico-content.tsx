"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileDown, FilterX, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { diasAte, formatarData, formatarDataCurta, hojeSaoPaulo } from "@/lib/datas";
import type { Movimento } from "@/lib/extrato";

type Periodo = "TODOS" | "HOJE" | "SEMANA" | "MES";
type Tipo = "TODOS" | "ENTRADA" | "SAIDA";
type Status = "TODOS" | "PAGO" | "PENDENTE";
type Origem = "TODAS" | Movimento["origem"];

const ORIGENS: { id: Origem; label: string }[] = [
  { id: "TODAS", label: "Tudo" },
  { id: "parcela", label: "Parcelas" },
  { id: "repasse", label: "Repasses" },
  { id: "audiencia", label: "Audiências" },
  { id: "lancamento", label: "Avulsos" },
];

function Chips<T extends string>({ valor, opcoes, onChange, rotulo }: { valor: T; opcoes: { id: T; label: string }[]; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
        {opcoes.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={valor === o.id}
            className={cn(
              "h-8 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors",
              valor === o.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Número no formato do Excel brasileiro: 2500,00 */
function numeroCsv(v: number | null) {
  return v === null ? "" : v.toFixed(2).replace(".", ",");
}

function campoCsv(t: string) {
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const ORIGEM_LABEL: Record<Movimento["origem"], string> = {
  parcela: "Parcela da causa",
  repasse: "Repasse ao cliente",
  audiencia: "Audiência",
  lancamento: "Lançamento avulso",
};

export function HistoricoContent({ movimentos }: { movimentos: Movimento[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("TODOS");
  const [tipo, setTipo] = useState<Tipo>("TODOS");
  const [status, setStatus] = useState<Status>("TODOS");
  const [origem, setOrigem] = useState<Origem>("TODAS");
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const mes = hojeSaoPaulo().slice(0, 7);
    return movimentos.filter((m) => {
      if (tipo !== "TODOS" && m.tipo !== tipo) return false;
      if (status === "PAGO" && m.status !== "PAGO") return false;
      if (status === "PENDENTE" && m.status === "PAGO") return false;
      if (origem !== "TODAS" && m.origem !== origem) return false;
      if (periodo !== "TODOS") {
        const d = diasAte(m.data);
        if (periodo === "HOJE" && d !== 0) return false;
        if (periodo === "SEMANA" && Math.abs(d) > 7) return false;
        if (periodo === "MES" && !m.data.startsWith(mes)) return false;
      }
      if (!q) return true;
      return [m.nome, m.reclamada, m.descricao, m.processoNumero, m.categoria, m.advogado].some((t) => t.toLowerCase().includes(q));
    });
  }, [movimentos, busca, tipo, status, origem, periodo]);

  // Totais só do que já foi pago de fato (dinheiro que passou pelo caixa).
  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let pendente = 0;
    for (const m of filtrados) {
      if (m.status !== "PAGO") {
        pendente++;
        continue;
      }
      if (m.tipo === "ENTRADA") entradas += m.valor;
      else saidas += m.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas, pendente };
  }, [filtrados]);

  function exportarCsv() {
    const cab = ["Data", "Origem", "Tipo", "Categoria", "Nome", "Empresa", "Processo", "Advogado", "Valor (R$)", "Parte escritório (R$)", "Parte cliente (R$)", "Status", "Descrição"];
    const linhas = filtrados.map((m) =>
      [
        formatarData(m.data),
        ORIGEM_LABEL[m.origem],
        m.tipo === "ENTRADA" ? "Entrada" : "Saída",
        m.categoria,
        m.nome,
        m.reclamada,
        m.processoNumero,
        m.advogado,
        numeroCsv(m.valor),
        numeroCsv(m.valorEscritorio),
        numeroCsv(m.valorCliente),
        m.status === "PAGO" ? "Pago" : m.status === "PENDENTE" ? "Pendente" : "Não pago",
        m.descricao,
      ]
        .map((c) => campoCsv(String(c)))
        .join(";")
    );
    // BOM para o Excel reconhecer os acentos.
    const csv = "﻿" + [cab.join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_ferreiradash_${hojeSaoPaulo()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function excluir(id: string) {
    setErro("");
    setExcluindo(id);
    startTransition(async () => {
      const res = await fetch(`/api/transacoes/${id}`, { method: "DELETE" }).catch(() => null);
      setExcluindo(null);
      setConfirmar(null);
      if (!res?.ok) {
        setErro("Não foi possível excluir o lançamento.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cliente, empresa, advogado, processo..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 pl-10" />
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={exportarCsv} disabled={filtrados.length === 0} title="Exportar o que está filtrado para Excel (CSV)">
            <FileDown /> <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>
        <div className="space-y-2 border-t border-border/40 pt-3">
          <Chips rotulo="O quê" valor={origem} onChange={setOrigem} opcoes={ORIGENS} />
          <Chips
            rotulo="Período"
            valor={periodo}
            onChange={setPeriodo}
            opcoes={[
              { id: "TODOS", label: "Tudo" },
              { id: "HOJE", label: "Hoje" },
              { id: "SEMANA", label: "7 dias" },
              { id: "MES", label: "Este mês" },
            ]}
          />
          <Chips
            rotulo="Tipo"
            valor={tipo}
            onChange={setTipo}
            opcoes={[
              { id: "TODOS", label: "Tudo" },
              { id: "ENTRADA", label: "Entradas" },
              { id: "SAIDA", label: "Saídas" },
            ]}
          />
          <Chips
            rotulo="Status"
            valor={status}
            onChange={setStatus}
            opcoes={[
              { id: "TODOS", label: "Tudo" },
              { id: "PAGO", label: "Pago" },
              { id: "PENDENTE", label: "Pendente" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">Entrou</p>
          <p className="text-sm font-bold tabular-nums text-emerald-300 sm:text-lg">{formatCurrency(totais.entradas)}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">Saiu</p>
          <p className="text-sm font-bold tabular-nums text-rose-300 sm:text-lg">{formatCurrency(totais.saidas)}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">Caixa</p>
          <p className={cn("text-sm font-bold tabular-nums sm:text-lg", totais.saldo >= 0 ? "text-emerald-300" : "text-rose-300")}>
            {formatCurrency(totais.saldo)}
          </p>
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        Os totais contam só o que já foi pago. Como inclui o dinheiro dos clientes antes do repasse, o caixa pode ser maior que o saldo do escritório.
        {totais.pendente > 0 && ` ${totais.pendente} pendente(s) na lista.`}
      </p>

      {erro && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">{erro}</p>}

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FilterX className="mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">Nada encontrado</p>
          <p className="text-xs text-muted-foreground">{movimentos.length === 0 ? "Ainda não há movimentações." : "Mude a busca ou os filtros."}</p>
        </div>
      ) : (
        <div className="space-y-2 pb-6">
          {filtrados.map((m) => {
            const entrada = m.tipo === "ENTRADA";
            const pendente = m.status !== "PAGO";
            const atrasado = pendente && diasAte(m.data) < 0;
            return (
              <Card key={m.key} className={cn("border-l-4", entrada ? "border-l-emerald-500/70" : "border-l-rose-500/70")}>
                <CardContent className="flex gap-3 p-3 sm:p-4">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      entrada ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {entrada ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold">{m.nome}</p>
                      <p className={cn("shrink-0 text-sm font-bold tabular-nums", entrada ? "text-emerald-400" : "text-rose-400", pendente && "opacity-60")}>
                        {entrada ? "+" : "−"} {formatCurrency(m.valor)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">{m.categoria}</span>
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
                    <p className="truncate text-xs text-muted-foreground">
                      {[m.descricao, m.reclamada && m.origem !== "parcela" ? m.reclamada : "", m.processoNumero ? `Proc. ${m.processoNumero}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {m.origem === "parcela" && m.valorEscritorio !== null && (
                      <p className="text-[11px] text-muted-foreground">
                        Escritório <span className="text-emerald-300">{formatCurrency(m.valorEscritorio)}</span> · cliente{" "}
                        <span className="text-amber-200">{formatCurrency(m.valorCliente ?? 0)}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-end gap-1">
                    {m.lancamentoId ? (
                      confirmar === m.lancamentoId ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setConfirmar(null)}>
                            Não
                          </Button>
                          <Button size="sm" variant="danger" className="h-8 px-2" onClick={() => excluir(m.lancamentoId!)} disabled={excluindo === m.lancamentoId}>
                            {excluindo === m.lancamentoId ? <Loader2 className="animate-spin" /> : "Excluir"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-0.5">
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Editar">
                            <Link href={m.link} aria-label="Editar lançamento">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-300"
                            onClick={() => setConfirmar(m.lancamentoId)}
                            title="Excluir"
                            aria-label="Excluir lançamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Abrir">
                        <Link href={m.link} aria-label="Abrir">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
