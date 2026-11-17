"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** OABs cujas intimações o app busca todo dia no Diário de Justiça Eletrônico Nacional (gratuito, sem cadastro). */
export function OabsCard({ oabs }: { oabs: { id: string; numero: string; uf: string }[] }) {
  const router = useRouter();
  const [oab, setOab] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pending, start] = useTransition();

  function adicionar() {
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/integracoes/oabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oab }),
      }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!res?.ok) return setMsg({ ok: false, texto: j?.error ?? "Não foi possível agora." });
      setOab("");
      if (j.falhou) {
        setMsg({ ok: false, texto: "OAB cadastrada, mas o Diário da Justiça não respondeu agora. O app tenta de novo amanhã cedo, ou use “Buscar agora” em Intimações." });
        return router.refresh();
      }
      setMsg({ ok: true, texto: j.novas > 0 ? `Pronto. ${j.novas} intimações da última semana já estão em Intimações.` : "Pronto. As intimações chegam a partir de agora." });
      router.refresh();
    });
  }

  function remover(id: string) {
    start(async () => {
      await fetch(`/api/integracoes/oabs?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold">Intimações do CNJ</h2>
          <p className="text-xs text-muted-foreground">
            Todo dia de manhã o app busca as intimações publicadas para estas OABs e avisa no celular. Gratuito.
          </p>
        </div>
      </div>
      {oabs.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {oabs.map((o) => (
            <li key={o.id} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm">
              OAB {o.numero}/{o.uf}
              <button type="button" aria-label={`Remover OAB ${o.numero}/${o.uf}`} disabled={pending} onClick={() => remover(o.id)} className="text-muted-foreground hover:text-rose-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (oab.trim()) adicionar();
        }}
      >
        <input
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Ex.: 148002/MG"
          value={oab}
          onChange={(e) => setOab(e.target.value)}
        />
        <Button type="submit" disabled={pending || !oab.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Adicionar
        </Button>
      </form>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-400" : "text-rose-300"}`}>{msg.texto}</p>}
    </section>
  );
}
