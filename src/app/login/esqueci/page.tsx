"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoRotulado } from "@/components/ui/campo-senha";
import { APP_NAME } from "@/lib/constants";

export default function EsqueciPage() {
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/login/esqueci")
      .then((r) => r.json())
      .then((d) => setConfigurado(!!d.configurado))
      .catch(() => setConfigurado(false));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/login/esqueci", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      return setErro(d?.error ?? "Não foi possível enviar agora. Tente de novo.");
    }
    setEnviado(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div>
          <p className="text-sm font-semibold">{APP_NAME}</p>
          <h1 className="text-lg font-bold">Esqueci minha senha</h1>
        </div>
        {configurado === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !configurado ? (
          <p className="text-sm text-muted-foreground">
            Peça ao dono do escritório para trocar sua senha em <b className="text-foreground">Usuários</b>.
          </p>
        ) : enviado ? (
          <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Se este e-mail tiver acesso, enviamos um link para criar a nova senha. Ele vale por 30 minutos. Veja também a caixa de spam.
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite o e-mail que você usa para entrar. Vamos mandar um link para criar uma senha nova.</p>
            <CampoRotulado id="email" rotulo="E-mail" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando} />
            {erro && <p className="text-xs font-medium text-red-400">{erro}</p>}
            <Button type="submit" className="w-full" disabled={enviando || !email}>
              {enviando ? <Loader2 className="animate-spin" /> : <Mail />} Enviar link
            </Button>
          </form>
        )}
        <Link href="/login" className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}
