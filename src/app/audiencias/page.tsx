import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listarAudiencias } from "@/lib/audiencias";
import { AudienciasContent } from "./audiencias-content";
import { AdvogadosTabs } from "@/components/layout/advogados-tabs";
import { usuarioAtual, type UsuarioLogado } from "@/lib/usuario-atual";

export const dynamic = "force-dynamic";

async function Lista({ eu }: { eu: UsuarioLogado }) {
  return <AudienciasContent audiencias={await listarAudiencias(eu)} perfil={eu.perfil} />;
}

export default async function AudienciasPage() {
  const eu = await usuarioAtual();
  return (
    <div className="space-y-5">
      <AdvogadosTabs />
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audiências</h1>
          <p className="text-sm text-muted-foreground">Agenda e pagamento dos advogados</p>
        </div>
        {eu.perfil !== "ADVOGADO" && (
        <Link
          href="/audiencias/nova"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova audiência
        </Link>
        )}
      </section>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />}>
        <Lista eu={eu} />
      </Suspense>
    </div>
  );
}
