import { Suspense } from "react";
import { listarMovimentos } from "@/lib/extrato";
import { HistoricoContent } from "./historico-content";

export const dynamic = "force-dynamic";

async function Extrato() {
  return <HistoricoContent movimentos={await listarMovimentos()} />;
}

export default function HistoricoPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">Tudo o que entrou e saiu: parcelas, repasses, audiências e lançamentos</p>
      </section>
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        }
      >
        <Extrato />
      </Suspense>
    </div>
  );
}
