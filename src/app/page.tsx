import { Suspense } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CashFlowChartLazy } from "@/components/dashboard/cash-flow-chart-lazy";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PendingList } from "@/components/dashboard/pending-list";
import { ParcelaLista } from "@/components/parcelas/parcela-lista";
import { AudienciaLista } from "@/components/audiencias/audiencia-lista";
import { getDashboardResumo } from "@/lib/finance";

export const dynamic = "force-dynamic";

async function DashboardContent() {
  const resumo = await getDashboardResumo();

  return (
    <>
      <SummaryCards
        saldoAtual={resumo.saldoAtual}
        entradasMes={resumo.entradasMes}
        saidasMes={resumo.saidasMes}
        aRepassarClientes={resumo.aRepassarClientes}
        aReceberEscritorio={resumo.aReceberEscritorio}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ParcelaLista
          titulo="Próximas entradas do escritório"
          descricao="Parcelas que a empresa ainda vai pagar (sua parte)"
          modo="entradas"
          itens={resumo.proximasEntradas}
          vazio="Nenhuma parcela a receber. Cadastre uma causa para começar."
        />
        <ParcelaLista
          titulo="Repasses a clientes"
          descricao="Quanto cada cliente deve receber"
          modo="repasses"
          itens={resumo.repassesClientes}
          vazio="Nenhum repasse pendente."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AudienciaLista
          titulo="Próximas audiências"
          descricao="Data, cliente, empresa e advogado"
          modo="proximas"
          itens={resumo.proximasAudiencias}
          vazio="Nenhuma audiência marcada."
        />
        <AudienciaLista
          titulo="Audiências a pagar"
          descricao="Já aconteceram; quanto pagar a cada advogado"
          modo="apagar"
          itens={resumo.audienciasAPagar}
          vazio="Nenhum advogado a pagar."
        />
      </div>

      <CashFlowChartLazy data={resumo.fluxoMensal} />

      {resumo.recebiveisPendentes.length > 0 && (
        <PendingList
          title="Outras entradas pendentes"
          items={resumo.recebiveisPendentes}
          emptyMessage="Nenhuma entrada avulsa pendente."
          variant="success"
        />
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[7.5rem] animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Início</h1>
        <p className="text-sm text-muted-foreground">Dinheiro do escritório, parcelas e repasses</p>
      </section>

      {/* Atalhos aparecem na hora, antes dos dados carregarem. */}
      <QuickActions />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
