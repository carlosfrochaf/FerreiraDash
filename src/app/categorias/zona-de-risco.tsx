"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Apaga todos os registros (mantém categorias e aparelhos de notificação). */
export function ZonaDeRisco() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState("");

  async function apagar() {
    if (texto !== "APAGAR") return;
    setApagando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/reset-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: texto }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erro ao apagar registros.");
      }
      window.location.href = "/";
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de conexão.");
      setApagando(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
        <div>
          <h2 className="font-semibold">Zona de risco</h2>
          <p className="text-sm text-muted-foreground">
            Apaga todos os lançamentos, causas, parcelas, repasses, contatos e processos. Categorias e notificações são mantidas. Não dá
            para desfazer.
          </p>
        </div>
      </div>

      {!aberto ? (
        <Button variant="outline" className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10" onClick={() => setAberto(true)}>
          <Trash2 /> Apagar todos os registros
        </Button>
      ) : (
        <div className="space-y-2">
          <label htmlFor="confirmar-apagar" className="text-sm">
            Digite <strong className="text-rose-300">APAGAR</strong> para confirmar:
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="confirmar-apagar" value={texto} onChange={(e) => setTexto(e.target.value)} disabled={apagando} className="h-11 sm:max-w-xs" autoComplete="off" />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setAberto(false); setTexto(""); }} disabled={apagando}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={apagar} disabled={texto !== "APAGAR" || apagando}>
                {apagando ? <Loader2 className="animate-spin" /> : <Trash2 />} Apagar tudo
              </Button>
            </div>
          </div>
          {erro && <p className="text-sm text-rose-300">{erro}</p>}
        </div>
      )}
    </section>
  );
}
