import { Suspense } from "react";
import { listarMovimentos } from "@/lib/extrato";
import { gerarDespesasRecorrentes } from "@/lib/despesas-recorrentes";
import { resumirDespesas } from "@/lib/despesas";
import { hojeSaoPaulo } from "@/lib/datas";
import { mesDe } from "@/lib/recorrencias";
import { DespesasContent } from "./despesas-content";

export const dynamic = "force-dynamic";

async function Despesas({ mes }: { mes: string }) {
  // Lança os custos fixos e salários do mês, caso o disparo das 8h ainda não tenha rodado.
  try {
    await gerarDespesasRecorrentes();
  } catch (err) {
    console.error("[recorrencias]", err);
  }
  return <DespesasContent mes={mes} resumo={resumirDespesas(await listarMovimentos(), mes)} />;
}

export default async function DespesasPage(props: { searchParams: Promise<{ mes?: string | string[] }> }) {
  const { mes: param } = await props.searchParams;
  const mes = typeof param === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : mesDe(hojeSaoPaulo());

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
        <p className="text-sm text-muted-foreground">Advogados, salários e custos do escritório, mês a mês</p>
      </section>
      <Suspense
        key={mes}
        fallback={
          <div className="space-y-3">
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        }
      >
        <Despesas mes={mes} />
      </Suspense>
    </div>
  );
}
