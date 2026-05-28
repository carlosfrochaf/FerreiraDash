import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PendingList } from "@/components/dashboard/pending-list";
import { getDashboardResumo } from "@/lib/finance";

async function DashboardContent() {
  const resumo = await getDashboardResumo();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do fluxo financeiro</p>
      </section>

      <SummaryCards
        saldoAtual={resumo.saldoAtual}
        entradasMes={resumo.entradasMes}
        saidasMes={resumo.saidasMes}
      />

      <QuickActions />

      <CashFlowChart data={resumo.fluxoMensal} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PendingList
          title="Próximos Repasses a Clientes"
          items={resumo.repassesPendentes}
          emptyMessage="Nenhum repasse pendente."
          variant="warning"
        />
        <PendingList
          title="Audiências Pendentes de Pagamento"
          items={resumo.audienciasPendentes}
          emptyMessage="Nenhuma audiência pendente."
          variant="danger"
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Carregando dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
