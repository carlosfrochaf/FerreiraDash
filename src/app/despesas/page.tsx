import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground">Advogados, salários e custos do escritório, mês a mês</p>
        </div>
        <Link
          href="/lancamentos/novo?modo=simples&tipo=SAIDA"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova despesa
        </Link>
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
