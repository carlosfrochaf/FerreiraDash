"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, maskCurrencyInput } from "@/lib/utils";
import { centavosParaString } from "@/lib/parcelas";
import { formatarData, formatarDataCurta, hojeSaoPaulo } from "@/lib/datas";
import type { PeticaoSerializada } from "@/lib/peticoes";
import { PixCopiar } from "@/components/ui/pix-copiar";

export const STATUS_PETICAO: Record<PeticaoSerializada["status"], { label: string; cor: string }> = {
  A_VALIDAR: { label: "Não pago", cor: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  A_PAGAR: { label: "Não pago", cor: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  PAGA: { label: "Pago", cor: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
};

export function PeticaoItem({ p, onClick }: { p: PeticaoSerializada; onClick: () => void }) {
  const st = STATUS_PETICAO[p.status];
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">
          {p.descricao} <span className="text-muted-foreground">· {p.clienteNome}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {p.advogadoNome} · entregue {formatarDataCurta(p.dataEntrega)}
        </p>
        <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset", st.cor)}>{st.label}</span>
      </div>
      <p className={cn("shrink-0 text-sm font-semibold tabular-nums", p.valor ? (p.status === "PAGA" ? "text-emerald-400" : "text-rose-300") : "text-muted-foreground")}>
        {p.valor ? formatCurrency(p.valor) : "Definir valor"}
      </p>
    </button>
  );
}

export function PeticaoModal({ peticao, onFechar }: { peticao: PeticaoSerializada | null; onFechar: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [data, setData] = useState(hojeSaoPaulo());
  const [valor, setValor] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  function fechar() {
    setErro("");
    setValor("");
    setConfirmarExclusao(false);
    setData(hojeSaoPaulo());
    onFechar();
  }

  async function chamar(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(typeof d.error === "string" ? d.error : "Não foi possível salvar.");
    }
  }

  function executar(fn: () => Promise<void>) {
    setErro("");
    startTransition(async () => {
      try {
        await fn();
        fechar();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro de conexão.");
      }
    });
  }

  if (!peticao) return null;
  const p = peticao;
  const url = `/api/peticoes/${p.id}`;

  function pagar() {
    executar(async () => {
      if (!p.valor) {
        const digitos = valor.replace(/\D/g, "");
        if (!/[1-9]/.test(digitos)) throw new Error("Informe o valor pago ao advogado.");
        await chamar(url, "PUT", {
          advogadoNome: p.advogadoNome,
          clienteNome: p.clienteNome,
          reclamada: p.reclamada ?? undefined,
          processoNumero: p.processoNumero ?? undefined,
          descricao: p.descricao,
          dataEntrega: p.dataEntrega,
          observacoes: p.observacoes ?? undefined,
          valor: centavosParaString(BigInt(digitos)),
          status: p.status,
        });
      }
      await chamar(url, "PATCH", { acao: "pagar", data });
    });
  }

  const st = STATUS_PETICAO[p.status];

  return (
    <Modal aberto onFechar={fechar} titulo={`${p.descricao} · ${p.clienteNome}`}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Advogado</dt>
            <dd className="font-medium">{p.advogadoNome}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entregue em</dt>
            <dd className="font-medium">{formatarData(p.dataEntrega)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{p.clienteNome}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</dt>
            <dd className="font-medium">{p.reclamada || "—"}</dd>
          </div>
          {p.processoNumero && (
            <div className="col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Processo</dt>
              <dd className="font-mono text-xs">{p.processoNumero}</dd>
            </div>
          )}
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <span className="font-semibold">{p.valor ? formatCurrency(p.valor) : "Valor não definido"}</span>
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset", st.cor)}>{st.label}</span>
            {p.dataPagamento && <span className="text-xs text-emerald-400">paga {formatarData(p.dataPagamento)}</span>}
          </div>
          {p.observacoes && <p className="col-span-2 text-xs text-muted-foreground">{p.observacoes}</p>}
        </dl>

        {erro && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
            {erro}
          </p>
        )}

        {p.status !== "PAGA" && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <PixCopiar rotulo={`Pix de ${p.advogadoNome}`} pix={p.advogadoPix} linkCadastro={`/peticoes/${p.id}/editar`} />
            {!p.valor && (
              <div className="space-y-1">
                <label htmlFor="pet-modal-valor" className="text-xs font-semibold text-muted-foreground">
                  Valor pago ao advogado
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input id="pet-modal-valor" inputMode="numeric" placeholder="0,00" value={valor} onChange={(e) => setValor(maskCurrencyInput(e.target.value))} className="h-11 pl-10 font-semibold" />
                </div>
              </div>
            )}
            <label htmlFor="pet-modal-data" className="text-xs font-semibold text-muted-foreground">
              Data do pagamento
            </label>
            <Input id="pet-modal-data" type="date" value={data} max={hojeSaoPaulo()} onChange={(e) => setData(e.target.value)} className="h-11" />
            <Button variant="success" className="w-full" disabled={pending || !data} onClick={pagar}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Marcar como pago
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/peticoes/${p.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
          {p.status === "PAGA" && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => executar(() => chamar(url, "PATCH", { acao: "desfazer_pagamento" }))}>
              <RotateCcw /> Desfazer pagamento
            </Button>
          )}
          {confirmarExclusao ? (
            <Button variant="danger" size="sm" disabled={pending} onClick={() => executar(() => chamar(url, "DELETE"))}>
              <Trash2 /> Confirmar exclusão
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-rose-300" onClick={() => setConfirmarExclusao(true)}>
              <Trash2 /> Excluir
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Card do início: petições ainda não pagas. */
export function PeticaoLista({ itens }: { itens: PeticaoSerializada[] }) {
  const [sel, setSel] = useState<PeticaoSerializada | null>(null);
  const total = itens.reduce((s, p) => s + Number(p.valor ?? 0), 0);
  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Petições não pagas</CardTitle>
            <p className="text-xs text-muted-foreground">
              {itens.length === 0 ? "Feitas pelos advogados" : `${itens.length} ${itens.length === 1 ? "petição" : "petições"} · ${formatCurrency(total)} a pagar`}
            </p>
          </div>
          <Link href="/peticoes" className="flex shrink-0 items-center text-xs font-medium text-primary hover:underline">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="max-h-[22rem] flex-1 space-y-2 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma petição para pagar.</p>
          ) : (
            itens.map((p) => <PeticaoItem key={p.id} p={p} onClick={() => setSel(p)} />)
          )}
        </CardContent>
      </Card>
      <PeticaoModal peticao={sel} onFechar={() => setSel(null)} />
    </>
  );
}
