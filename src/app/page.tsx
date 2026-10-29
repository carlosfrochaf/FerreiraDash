import { Suspense } from "react";
import { ResumoHero } from "@/components/dashboard/resumo-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Pendencias } from "@/components/dashboard/pendencias";
import { CashFlowChartLazy } from "@/components/dashboard/cash-flow-chart-lazy";
import { getDashboardResumo } from "@/lib/finance";

export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function saudacao() {
  const agora = new Date();
  const fuso = { timeZone: "America/Sao_Paulo" } as const;
  const hora = Number(agora.toLocaleString("en-US", { ...fuso, hour: "numeric", hour12: false }));
  const [a, m, d] = agora.toLocaleDateString("sv-SE", fuso).split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return {
    ola: hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite",
    data: `${DIAS[dia]}, ${d} de ${MESES[m - 1]}`,
  };
}

async function Conteudo() {
  const r = await getDashboardResumo();
  return (
    <>
      <ResumoHero
        saldoAtual={r.saldoAtual}
        entradasMes={r.entradasMes}
        saidasMes={r.saidasMes}
        aRepassarClientes={r.aRepassarClientes}
        aReceberEscritorio={r.aReceberEscritorio}
      />
      <QuickActions />
      <Pendencias
        proximasEntradas={r.proximasEntradas}
        repassesClientes={r.repassesClientes}
        audienciasAPagar={r.audienciasAPagar}
        peticoesPendentes={r.peticoesPendentes}
        proximasAudiencias={r.proximasAudiencias}
        recebiveisPendentes={r.recebiveisPendentes}
      />
      <CashFlowChartLazy data={r.fluxoMensal} />
    </>
  );
}

function Carregando() {
  return (
    <>
      <div className="h-44 animate-pulse rounded-3xl border border-border/60 bg-card" />
      <div className="h-16 animate-pulse rounded-2xl bg-card/60" />
      <div className="h-80 animate-pulse rounded-3xl border border-border/60 bg-card" />
    </>
  );
}

export default function HomePage() {
  const { ola, data } = saudacao();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{ola}</h1>
        <p className="text-sm text-muted-foreground">{data}</p>
      </header>
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}
