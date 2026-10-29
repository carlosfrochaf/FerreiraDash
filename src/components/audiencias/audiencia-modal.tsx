"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, maskCurrencyInput } from "@/lib/utils";
import { centavosParaString } from "@/lib/parcelas";
import { diasAte, formatarData, hojeSaoPaulo } from "@/lib/datas";
import type { AudienciaSerializada } from "@/lib/audiencias";
import { PixCopiar } from "@/components/ui/pix-copiar";

export function AudienciaModal({ audiencia, onFechar }: { audiencia: AudienciaSerializada | null; onFechar: () => void }) {
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

  if (!audiencia) return null;
  const a = audiencia;
  const paga = a.statusPagamento === "PAGO";
  const aconteceu = diasAte(a.data) <= 0;
  const url = `/api/audiencias/${a.id}`;

  function pagar() {
    executar(async () => {
      // Sem valor definido: grava o valor digitado antes de marcar como paga.
      if (!a.valor) {
        const digitos = valor.replace(/\D/g, "");
        if (!digitos) throw new Error("Informe o valor pago ao advogado.");
        await chamar(url, "PUT", {
          data: a.data,
          hora: a.hora ?? undefined,
          advogadoNome: a.advogadoNome,
          clienteNome: a.clienteNome,
          reclamada: a.reclamada ?? undefined,
          processoNumero: a.processoNumero ?? undefined,
          observacoes: a.observacoes ?? undefined,
          valor: centavosParaString(BigInt(digitos)),
        });
      }
      await chamar(url, "PATCH", { acao: "pagar", data });
    });
  }

  return (
    <Modal aberto onFechar={fechar} titulo={`Audiência · ${a.clienteNome}`}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Data</dt>
            <dd className="font-medium">
              {formatarData(a.data)}
              {a.hora ? ` às ${a.hora}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Advogado</dt>
            <dd className="font-medium">{a.advogadoNome}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{a.clienteNome}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</dt>
            <dd className="font-medium">{a.reclamada || "—"}</dd>
          </div>
          {a.processoNumero && (
            <div className="col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Processo</dt>
              <dd className="font-mono text-xs">{a.processoNumero}</dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pagamento ao advogado</dt>
            <dd className="font-semibold">
              {a.valor ? formatCurrency(a.valor) : "Valor não definido"}
              {paga && <span className="ml-2 text-emerald-400">pago em {formatarData(a.dataPagamento!)}</span>}
            </dd>
          </div>
          {a.observacoes && <p className="col-span-2 text-xs text-muted-foreground">{a.observacoes}</p>}
        </dl>

        {erro && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-rose-300">
            {erro}
          </p>
        )}

        {!paga && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <PixCopiar rotulo={`Pix de ${a.advogadoNome}`} pix={a.advogadoPix} linkCadastro={`/audiencias/${a.id}/editar`} />
            {!aconteceu && <p className="text-xs text-muted-foreground">A audiência ainda não aconteceu. Dá para pagar antes, se for o caso.</p>}
            {!a.valor && (
              <div className="space-y-1">
                <label htmlFor="aud-modal-valor" className="text-xs font-semibold text-muted-foreground">
                  Valor pago ao advogado
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="aud-modal-valor"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(maskCurrencyInput(e.target.value))}
                    className="h-11 pl-10 font-semibold"
                  />
                </div>
              </div>
            )}
            <label htmlFor="aud-modal-data" className="text-xs font-semibold text-muted-foreground">
              Data do pagamento
            </label>
            <Input id="aud-modal-data" type="date" value={data} max={hojeSaoPaulo()} onChange={(e) => setData(e.target.value)} className="h-11" />
            <Button variant="success" className="w-full" disabled={pending || !data} onClick={pagar}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Marcar como paga
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/audiencias/${a.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
          {paga && (
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
