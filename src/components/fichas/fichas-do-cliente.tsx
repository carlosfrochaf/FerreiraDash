"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarDataCurta } from "@/lib/datas";

export type FichaResumo = { id: string; empresa: string | null; advogadoNome: string | null; situacao: "RASCUNHO" | "ENVIADA"; criadaEm: string };

export function FichasDoCliente({ clienteId, fichas, podeCriar }: { clienteId: string; fichas: FichaResumo[]; podeCriar: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function nova() {
    setErro(null);
    start(async () => {
      const res = await fetch("/api/fichas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clienteId }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return setErro(j.error ?? "Não foi possível abrir a ficha.");
      router.push(`/clientes/${clienteId}/fichas/${j.id}`);
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fichas de atendimento</h2>
        {podeCriar && (
          <Button type="button" variant="outline" size="sm" onClick={nova} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Nova ficha
          </Button>
        )}
      </div>
      {erro && <p className="text-xs text-rose-300">{erro}</p>}
      {fichas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma ficha ainda.</p>
      ) : (
        fichas.map((f) => (
          <Link
            key={f.id}
            href={`/clientes/${clienteId}/fichas/${f.id}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm hover:bg-accent/40"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                {f.empresa || "Empresa não informada"} · {f.advogadoNome || "sem advogado"} · {formatarDataCurta(f.criadaEm)}
              </span>
            </span>
            <span className={`shrink-0 text-xs font-semibold ${f.situacao === "ENVIADA" ? "text-emerald-400" : "text-amber-300"}`}>
              {f.situacao === "ENVIADA" ? "Enviada ao advogado" : "Rascunho"}
            </span>
          </Link>
        ))
      )}
    </section>
  );
}
