"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Liga o aviso do ZapSign (uma vez) e traz os contratos já assinados. */
export function ConectarZapsign({ configurado, conectadoEm }: { configurado: boolean; conectadoEm: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function conectar() {
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/integracoes/zapsign", { method: "POST" }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!res?.ok) return setMsg({ ok: false, texto: j?.error ?? "Não foi possível conectar agora." });
      setMsg({
        ok: true,
        texto: j.trazidos > 0 ? `Pronto. ${j.trazidos} contrato${j.trazidos === 1 ? "" : "s"} já assinado${j.trazidos === 1 ? "" : "s"} entr${j.trazidos === 1 ? "ou" : "aram"} na lista.` : "Pronto. Os próximos contratos assinados chegam aqui sozinhos.",
      });
      router.refresh();
    });
  }

  if (!configurado) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Para ligar o ZapSign, coloque o token da API do ZapSign na Vercel com o nome <code className="text-foreground">ZAPSIGN_TOKEN</code>.
      </p>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-sm">
        <PenLine className="h-4 w-4 text-primary" />
        {conectadoEm ? (
          <span className="text-muted-foreground">ZapSign ligado desde {new Date(conectadoEm).toLocaleDateString("pt-BR")}.</span>
        ) : (
          <span>ZapSign ainda não ligado.</span>
        )}
      </div>
      <Button type="button" size="sm" variant={conectadoEm ? "outline" : "default"} onClick={conectar} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : conectadoEm ? <RefreshCw /> : <PenLine />}{" "}
        {conectadoEm ? "Buscar assinados" : "Conectar ZapSign"}
      </Button>
      {msg && <p className={`w-full text-xs ${msg.ok ? "text-emerald-400" : "text-rose-300"}`}>{msg.texto}</p>}
    </section>
  );
}
