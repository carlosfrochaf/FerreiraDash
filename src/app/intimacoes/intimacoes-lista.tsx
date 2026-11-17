"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Loader2, RefreshCw, Scale, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatarDataCurta } from "@/lib/datas";
import { ROTULO_TIPO, type TipoIntimacao } from "@/lib/intimacoes";

export type IntimacaoTela = {
  id: string;
  data: string;
  tipo: TipoIntimacao;
  processo: string;
  orgao: string | null;
  texto: string;
  link: string | null;
  cliente: { id: string; nome: string } | null;
  lida: boolean;
};

const COR: Record<TipoIntimacao, string> = {
  SENTENCA: "bg-rose-500/15 text-rose-300",
  ACORDAO: "bg-rose-500/15 text-rose-300",
  DECISAO: "bg-amber-500/15 text-amber-200",
  AUDIENCIA: "bg-sky-500/15 text-sky-300",
  DESPACHO: "bg-muted text-foreground/80",
  OUTRA: "bg-muted text-foreground/80",
};

type Aba = "novas" | "todas";

export function IntimacoesLista({ intimacoes, temOab }: { intimacoes: IntimacaoTela[]; temOab: boolean }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("novas");
  const [buscando, startBusca] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const novas = intimacoes.filter((i) => !i.lida).length;
  const lista = useMemo(() => (aba === "novas" ? intimacoes.filter((i) => !i.lida) : intimacoes), [aba, intimacoes]);

  function buscar() {
    setMsg(null);
    startBusca(async () => {
      const res = await fetch("/api/intimacoes/buscar", { method: "POST" }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!res?.ok) return setMsg({ ok: false, texto: j?.error ?? "Não foi possível buscar agora." });
      setMsg({ ok: true, texto: j.novas > 0 ? `${j.novas} ${j.novas === 1 ? "intimação nova" : "intimações novas"}.` : "Nenhuma intimação nova." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1" role="tablist">
          {(
            [
              ["novas", `Não lidas${novas ? ` (${novas})` : ""}`],
              ["todas", "Todas"],
            ] as const
          ).map(([id, rotulo]) => (
            <button
              key={id}
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", aba === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {temOab && (
          <Button type="button" variant="outline" size="sm" onClick={buscar} disabled={buscando}>
            {buscando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Buscar agora
          </Button>
        )}
      </div>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-400" : "text-rose-300")}>{msg.texto}</p>}

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <Scale className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{aba === "novas" ? "Nenhuma intimação para ler." : "Nenhuma intimação ainda."}</p>
        </div>
      ) : (
        lista.map((i) => <CartaoIntimacao key={i.id} i={i} />)
      )}
    </div>
  );
}

function CartaoIntimacao({ i }: { i: IntimacaoTela }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [pending, start] = useTransition();

  function marcar(lida: boolean) {
    start(async () => {
      await fetch(`/api/intimacoes/${i.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lida }),
      }).catch(() => null);
      router.refresh();
    });
  }

  return (
    <Card className={cn(i.lida && "opacity-70")}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", COR[i.tipo])}>{ROTULO_TIPO[i.tipo]}</span>
              <span className="text-xs text-muted-foreground">{formatarDataCurta(i.data)}</span>
            </div>
            <p className="truncate font-semibold">
              {i.cliente ? (
                <Link href={`/clientes/${i.cliente.id}`} className="hover:underline">
                  {i.cliente.nome}
                </Link>
              ) : (
                <span className="text-muted-foreground">Processo sem cliente no app</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{[i.processo, i.orgao].filter(Boolean).join(" · ")}</p>
          </div>
          <Button type="button" size="sm" variant={i.lida ? "ghost" : "outline"} disabled={pending} onClick={() => marcar(!i.lida)} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : i.lida ? <Undo2 /> : <Check />} {i.lida ? "Não lida" : "Lida"}
          </Button>
        </div>
        <button type="button" onClick={() => setAberta((a) => !a)} aria-expanded={aberta} className="flex items-center gap-1 text-xs font-medium text-primary">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", aberta && "rotate-180")} /> {aberta ? "Esconder texto" : "Ver texto"}
        </button>
        {aberta && <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">{i.texto}</p>}
        {i.link && (
          <a href={i.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" /> Documento no PJe
          </a>
        )}
      </CardContent>
    </Card>
  );
}
