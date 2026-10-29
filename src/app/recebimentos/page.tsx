import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listarRecebimentos } from "@/lib/recebimentos";
import { RecebimentosContent } from "./recebimentos-content";

export const dynamic = "force-dynamic";

async function Lista() {
  const recebimentos = await listarRecebimentos(200);
  return <RecebimentosContent recebimentos={recebimentos} />;
}

export default function RecebimentosPage() {
  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recebimentos</h1>
          <p className="text-sm text-muted-foreground">Causas, parcelas e repasses aos clientes</p>
        </div>
        <Link
          href="/lancamentos/novo?modo=causa"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova causa
        </Link>
      </section>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        }
      >
        <Lista />
      </Suspense>
    </div>
  );
}
