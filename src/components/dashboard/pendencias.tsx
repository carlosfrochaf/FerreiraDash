"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, CalendarClock, ChevronRight, FileText, Send, type LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { diasAte, formatarDataCurta } from "@/lib/datas";
import type { ParcelaResumo, TransacaoComRelacoes } from "@/types";
import type { AudienciaSerializada } from "@/lib/audiencias";
import type { PeticaoSerializada } from "@/lib/peticoes";
import { ParcelaModal } from "@/components/parcelas/parcela-modal";
import { AudienciaModal } from "@/components/audiencias/audiencia-modal";
import { PeticaoModal } from "@/components/peticoes/peticao-ui";

type Aba = "receber" | "repassar" | "pagar" | "audiencias";

type Props = {
  proximasEntradas: ParcelaResumo[];
  repassesClientes: ParcelaResumo[];
  audienciasAPagar: AudienciaSerializada[];
  peticoesPendentes: PeticaoSerializada[];
  proximasAudiencias: AudienciaSerializada[];
  recebiveisPendentes: TransacaoComRelacoes[];
};

/** Selo de data discreto: "Hoje", "Amanhã", "Atrasada 3d" ou "12 nov". */
function Quando({ data, atrasoConta = true }: { data: string; atrasoConta?: boolean }) {
  const d = diasAte(data);
  const texto = d === 0 ? "Hoje" : d === 1 ? "Amanhã" : d < 0 && atrasoConta ? `Atrasada ${-d}d` : formatarDataCurta(data).replace(/ \d{4}$/, "");
  const destaque = atrasoConta && d < 0 ? "text-rose-300" : d <= 1 && d >= 0 ? "text-sky-300" : "text-muted-foreground";
  return <span className={cn("text-xs font-medium", destaque)}>{texto}</span>;
}

function Linha({
  icon: Icon,
  tom,
  titulo,
  sub,
  valor,
  valorTom,
  lateral,
  onClick,
  href,
}: {
  icon: LucideIcon;
  tom: string;
  titulo: React.ReactNode;
  sub: React.ReactNode;
  valor: string;
  valorTom?: string;
  lateral?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const conteudo = (
    <>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tom)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn("text-sm font-semibold tabular-nums", valorTom)}>{valor}</span>
        {lateral}
      </span>
    </>
  );
  const classe =
    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return href ? (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <button onClick={onClick} className={classe}>
      {conteudo}
    </button>
  );
}

export function Pendencias(props: Props) {
  const [parcela, setParcela] = useState<ParcelaResumo | null>(null);
  const [audiencia, setAudiencia] = useState<AudienciaSerializada | null>(null);
  const [peticao, setPeticao] = useState<PeticaoSerializada | null>(null);

  const repassar = useMemo(() => props.repassesClientes.filter((p) => p.statusRecebimento === "RECEBIDO"), [props.repassesClientes]);
  const aguardandoEmpresa = props.repassesClientes.length - repassar.length;

  // Pagamentos aos advogados: audiências já feitas e petições não pagas, das mais antigas para as mais novas.
  const pagar = useMemo(
    () =>
      [
        ...props.audienciasAPagar.map((a) => ({ tipo: "audiencia" as const, data: a.data, a })),
        ...props.peticoesPendentes.map((p) => ({ tipo: "peticao" as const, data: p.dataEntrega, p })),
      ].sort((x, y) => x.data.localeCompare(y.data)),
    [props.audienciasAPagar, props.peticoesPendentes]
  );

  const contagem: Record<Aba, number> = {
    receber: props.proximasEntradas.length + props.recebiveisPendentes.length,
    repassar: repassar.length,
    pagar: pagar.length,
    audiencias: props.proximasAudiencias.length,
  };

  const abas: { id: Aba; label: string }[] = [
    { id: "receber", label: "Receber" },
    { id: "repassar", label: "Repassar" },
    { id: "pagar", label: "Pagar" },
    { id: "audiencias", label: "Agenda" },
  ];

  const [aba, setAba] = useState<Aba>(() => abas.find((a) => contagem[a.id] > 0)?.id ?? "receber");

  const totais: Record<Aba, string | null> = {
    receber: props.proximasEntradas.length ? `${formatCurrency(props.proximasEntradas.reduce((s, p) => s + Number(p.valorEscritorio), 0))} da sua parte` : null,
    repassar: repassar.length ? `${formatCurrency(repassar.reduce((s, p) => s + Number(p.valorCliente), 0))} para os clientes` : null,
    pagar: (() => {
      const total = pagar.reduce((s, i) => s + Number((i.tipo === "audiencia" ? i.a.valor : i.p.valor) ?? 0), 0);
      return total > 0 ? `${formatCurrency(total)} aos advogados` : null;
    })(),
    audiencias: null,
  };

  const vazio: Record<Aba, string> = {
    receber: "Nada a receber por enquanto.",
    repassar: "Nenhum repasse pendente.",
    pagar: "Nenhum advogado a pagar.",
    audiencias: "Nenhuma audiência marcada.",
  };

  const links: Record<Aba, string> = { receber: "/recebimentos", repassar: "/recebimentos", pagar: "/peticoes", audiencias: "/audiencias" };

  return (
    <section className="rounded-3xl border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 className="text-base font-semibold">Pendências</h2>
        <Link href={links[aba]} className="flex items-center text-xs font-medium text-primary hover:underline">
          Ver tudo <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div role="tablist" aria-label="Pendências" className="mx-4 mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-muted/50 p-1 sm:mx-5">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[13px] font-medium transition-colors sm:text-sm",
              aba === a.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="truncate">{a.label}</span>
            {contagem[a.id] > 0 && (
              <span className={cn("text-[11px] font-bold tabular-nums", aba === a.id ? "text-primary" : "text-muted-foreground/80")}>
                {contagem[a.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="px-2 pb-3 pt-2 sm:px-3">
        {totais[aba] && <p className="px-2 pb-1 text-xs text-muted-foreground">{totais[aba]}</p>}

        <div className="max-h-[26rem] space-y-0.5 overflow-y-auto">
          {contagem[aba] === 0 && <p className="px-2 py-10 text-center text-sm text-muted-foreground">{vazio[aba]}</p>}

          {aba === "receber" && (
            <>
              {props.proximasEntradas.map((p) => (
                <Linha
                  key={p.id}
                  icon={ArrowDownLeft}
                  tom="bg-emerald-500/10 text-emerald-400"
                  titulo={p.recebimento.reclamada || p.recebimento.clienteNome}
                  sub={`${p.recebimento.clienteNome} · parcela ${p.numero}/${p.totalParcelas}`}
                  valor={formatCurrency(p.valorParcela)}
                  lateral={<Quando data={p.vencimento} />}
                  onClick={() => setParcela(p)}
                />
              ))}
              {props.recebiveisPendentes.map((t) => (
                <Linha
                  key={t.id}
                  icon={ArrowDownLeft}
                  tom="bg-emerald-500/10 text-emerald-400"
                  titulo={t.clienteNome || t.descricao || "Entrada avulsa"}
                  sub={t.descricao || "Lançamento avulso"}
                  valor={formatCurrency(Number(t.valor))}
                  lateral={<Quando data={String(t.dataCompetencia)} />}
                  href={`/lancamentos/novo?edit=${t.id}`}
                />
              ))}
            </>
          )}

          {aba === "repassar" &&
            repassar.map((p) => (
              <Linha
                key={p.id}
                icon={Send}
                tom="bg-amber-500/10 text-amber-300"
                titulo={p.recebimento.clienteNome}
                sub={`${p.recebimento.reclamada ?? "Causa"} · parcela ${p.numero}/${p.totalParcelas}`}
                valor={formatCurrency(p.valorCliente)}
                valorTom="text-amber-200"
                lateral={<span className="text-xs text-muted-foreground">{p.recebimento.clientePix ? "Pix cadastrado" : "Sem Pix"}</span>}
                onClick={() => setParcela(p)}
              />
            ))}
          {aba === "repassar" && aguardandoEmpresa > 0 && (
            <p className="px-2 pt-2 text-xs text-muted-foreground">
              + {aguardandoEmpresa} {aguardandoEmpresa === 1 ? "parcela aguardando" : "parcelas aguardando"} a empresa pagar.
            </p>
          )}

          {aba === "pagar" &&
            pagar.map((i) =>
              i.tipo === "audiencia" ? (
                <Linha
                  key={`a${i.a.id}`}
                  icon={CalendarClock}
                  tom="bg-rose-500/10 text-rose-300"
                  titulo={i.a.advogadoNome}
                  sub={`Audiência de ${i.a.clienteNome}`}
                  valor={i.a.valor ? formatCurrency(i.a.valor) : "Definir"}
                  valorTom={i.a.valor ? "" : "text-muted-foreground"}
                  lateral={<Quando data={i.a.data} atrasoConta={false} />}
                  onClick={() => setAudiencia(i.a)}
                />
              ) : (
                <Linha
                  key={`p${i.p.id}`}
                  icon={FileText}
                  tom="bg-rose-500/10 text-rose-300"
                  titulo={i.p.advogadoNome}
                  sub={`${i.p.descricao} · ${i.p.clienteNome}`}
                  valor={i.p.valor ? formatCurrency(i.p.valor) : "Definir"}
                  valorTom={i.p.valor ? "" : "text-muted-foreground"}
                  lateral={<Quando data={i.p.dataEntrega} atrasoConta={false} />}
                  onClick={() => setPeticao(i.p)}
                />
              )
            )}

          {aba === "audiencias" &&
            props.proximasAudiencias.map((a) => (
              <Linha
                key={a.id}
                icon={CalendarClock}
                tom="bg-sky-500/10 text-sky-300"
                titulo={`${a.clienteNome}${a.reclamada ? ` × ${a.reclamada}` : ""}`}
                sub={`Adv. ${a.advogadoNome}${a.hora ? ` · ${a.hora}` : ""}`}
                valor=""
                lateral={<Quando data={a.data} atrasoConta={false} />}
                onClick={() => setAudiencia(a)}
              />
            ))}
        </div>
      </div>

      <ParcelaModal parcela={parcela} onFechar={() => setParcela(null)} />
      <AudienciaModal audiencia={audiencia} onFechar={() => setAudiencia(null)} />
      <PeticaoModal peticao={peticao} onFechar={() => setPeticao(null)} />
    </section>
  );
}
