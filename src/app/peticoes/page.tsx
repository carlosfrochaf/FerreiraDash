import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listarPeticoes } from "@/lib/peticoes";
import { AdvogadosTabs } from "@/components/layout/advogados-tabs";
import { PeticoesContent } from "./peticoes-content";

export const dynamic = "force-dynamic";

async function Lista() {
  return <PeticoesContent peticoes={await listarPeticoes()} />;
}

export default function PeticoesPage() {
  return (
    <div className="space-y-5">
      <AdvogadosTabs />
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Petições</h1>
          <p className="text-sm text-muted-foreground">Feitas pelos advogados: pagas e não pagas</p>
        </div>
        <Link
          href="/peticoes/nova"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova petição
        </Link>
      </section>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />}>
        <Lista />
      </Suspense>
    </div>
  );
}
