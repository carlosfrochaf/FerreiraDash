"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Send, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { formatarData, hojeSaoPaulo } from "@/lib/datas";
import type { ParcelaResumo } from "@/types";
import { PrazoBadge } from "./prazo-badge";

type Props = {
  parcela: ParcelaResumo | null;
  onFechar: () => void;
};

type Acao =
  | { acao: "receber"; data: string }
  | { acao: "desfazer_recebimento" }
  | { acao: "repassar"; data: string }
  | { acao: "desfazer_repasse" }
  | { acao: "alterar_vencimento"; vencimento: string };

export function ParcelaModal({ parcela, onFechar }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [data, setData] = useState(hojeSaoPaulo());
  const [novoVencimento, setNovoVencimento] = useState("");
  const [editandoVencimento, setEditandoVencimento] = useState(false);

  function fechar() {
    setErro("");
    setEditandoVencimento(false);
    setData(hojeSaoPaulo());
    onFechar();
  }

  function executar(body: Acao) {
    if (!parcela) return;
    setErro("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/parcelas/${parcela.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErro(typeof d.error === "string" ? d.error : "Não foi possível salvar.");
          return;
        }
        fechar();
        router.refresh();
      } catch {
        setErro("Erro de conexão. Tente de novo.");
      }
    });
  }

  if (!parcela) return null;
  const p = parcela;
  const recebida = p.statusRecebimento === "RECEBIDO";
  const repassada = p.statusRepasse === "REPASSADO";

  return (
    <Modal aberto onFechar={fechar} titulo={`Parcela ${p.numero}/${p.totalParcelas} · ${p.recebimento.clienteNome}`}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          {p.recebimento.reclamada && (
            <div className="col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</dt>
              <dd className="font-medium">{p.recebimento.reclamada}</dd>
            </div>
          )}
          {p.recebimento.processoNumero && (
            <div className="col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Processo</dt>
              <dd className="font-mono text-xs">{p.recebimento.processoNumero}</dd>
            </div>
          )}
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vencimento</dt>
            <dd className="flex flex-wrap items-center gap-1.5 font-medium">
              {formatarData(p.vencimento)}
              {!recebida && <PrazoBadge vencimento={p.vencimento} />}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parcela</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(p.valorParcela)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escritório</dt>
            <dd className="font-semibold tabular-nums text-emerald-400">{formatCurrency(p.valorEscritorio)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</dt>
            <dd className="font-semibold tabular-nums text-amber-300">{formatCurrency(p.valorCliente)}</dd>
          </div>
        </dl>

        <ol className="space-y-2 text-sm">
          <li className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">1. Pagamento da empresa</span>
            <span className={recebida ? "font-medium text-emerald-400" : "text-muted-foreground"}>
              {recebida ? `Recebida em ${formatarData(p.dataRecebimento!)}` : "Pendente"}
            </span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">2. Repasse ao cliente</span>
            <span className={repassada ? "font-medium text-emerald-400" : "text-muted-foreground"}>
              {repassada ? `Repassada em ${formatarData(p.dataRepasse!)}` : recebida ? "Pronta para repassar" : "Aguardando recebimento"}
            </span>
          </li>
        </ol>

        {erro && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
            {erro}
          </p>
        )}

        {/* Próxima ação principal */}
        {(!recebida || !repassada) && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <label htmlFor="data-acao" className="text-xs font-semibold text-muted-foreground">
              {!recebida ? "Data em que a empresa pagou" : "Data do repasse ao cliente"}
            </label>
            <Input id="data-acao" type="date" value={data} max={hojeSaoPaulo()} onChange={(e) => setData(e.target.value)} className="h-11" />
            {!recebida ? (
              <Button variant="success" className="w-full" disabled={pending || !data} onClick={() => executar({ acao: "receber", data })}>
                {pending ? <Loader2 className="animate-spin" /> : <Check />}
                Recebido da empresa
              </Button>
            ) : (
              <Button className="w-full" disabled={pending || !data} onClick={() => executar({ acao: "repassar", data })}>
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                Marcar repasse de {formatCurrency(p.valorCliente)} como feito
              </Button>
            )}
          </div>
        )}

        {/* Ações secundárias */}
        <div className="flex flex-wrap gap-2">
          {!recebida && !editandoVencimento && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNovoVencimento(p.vencimento);
                setEditandoVencimento(true);
              }}
            >
              <CalendarClock /> Mudar vencimento
            </Button>
          )}
          {recebida && !repassada && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => executar({ acao: "desfazer_recebimento" })}>
              <RotateCcw /> Desfazer recebimento
            </Button>
          )}
          {repassada && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => executar({ acao: "desfazer_repasse" })}>
              <RotateCcw /> Desfazer repasse
            </Button>
          )}
        </div>

        {editandoVencimento && (
          <div className="flex gap-2">
            <Input type="date" value={novoVencimento} onChange={(e) => setNovoVencimento(e.target.value)} className="h-11" />
            <Button
              className="h-11 shrink-0"
              disabled={pending || !novoVencimento}
              onClick={() => executar({ acao: "alterar_vencimento", vencimento: novoVencimento })}
            >
              Salvar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
