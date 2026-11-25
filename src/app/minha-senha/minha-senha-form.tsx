"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoRotulado } from "@/components/ui/campo-senha";

export function MinhaSenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova.length < 8) return setMsg({ ok: false, texto: "A nova senha precisa ter pelo menos 8 caracteres." });
    if (nova !== confirma) return setMsg({ ok: false, texto: "As senhas novas não são iguais." });
    setEnviando(true);
    const res = await fetch("/api/conta/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atual, nova }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      return setMsg({ ok: false, texto: d?.error ?? "Não foi possível trocar agora." });
    }
    setAtual("");
    setNova("");
    setConfirma("");
    setMsg({ ok: true, texto: "Senha trocada. Nos outros aparelhos, entre de novo com a senha nova." });
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <CampoRotulado id="atual" rotulo="Senha atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} disabled={enviando} />
      <CampoRotulado id="nova" rotulo="Nova senha (mínimo 8 caracteres)" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} disabled={enviando} />
      <CampoRotulado id="confirma" rotulo="Repita a nova senha" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} disabled={enviando} />
      {msg && <p className={`text-xs font-medium ${msg.ok ? "text-emerald-300" : "text-red-400"}`}>{msg.texto}</p>}
      <Button type="submit" className="w-full" disabled={enviando || !atual || !nova || !confirma}>
        {enviando ? <Loader2 className="animate-spin" /> : <KeyRound />} Trocar senha
      </Button>
    </form>
  );
}
