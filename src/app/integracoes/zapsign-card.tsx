"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PenLine, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ZapsignCard({ conectadoEm }: { conectadoEm: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  function chamar(method: "POST" | "DELETE") {
    setErro("");
    start(async () => {
      const res = await fetch("/api/integracoes/zapsign", {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ token }) : undefined,
      }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) return setErro(typeof d?.error === "string" ? d.error : "Não foi possível agora. Tente de novo.");
      setToken("");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">ZapSign</h2>
            <p className="text-xs text-muted-foreground">Assinatura eletrônica de contratos</p>
          </div>
        </div>
        {conectadoEm && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Conectado em {conectadoEm}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Quando o cliente terminar de assinar no ZapSign, o app guarda os PDFs assinados nos documentos dele (cria o cliente se for novo), abre uma ficha em
        rascunho e avisa você e a secretária no celular.
      </p>

      {conectadoEm ? (
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => confirm("Desconectar o ZapSign? Os próximos contratos assinados não vão mais entrar sozinhos.") && chamar("DELETE")}>
          {pending ? <Loader2 className="animate-spin" /> : <Unplug />} Desconectar
        </Button>
      ) : (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token da API do ZapSign</span>
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole aqui o token"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <p className="text-xs text-muted-foreground">No ZapSign: Configurações → Integração → API → copie o &quot;Token de acesso&quot;.</p>
          <Button type="button" size="sm" disabled={pending || token.trim().length < 10} onClick={() => chamar("POST")}>
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Conectar
          </Button>
        </div>
      )}
      {erro && <p className="text-xs text-rose-300">{erro}</p>}
    </section>
  );
}
