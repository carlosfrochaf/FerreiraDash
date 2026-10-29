"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";

function LoginForm() {
  const searchParams = useSearchParams();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível entrar.");
      }
      // Só aceita destino interno, para não virar redirecionamento aberto.
      const next = searchParams.get("next");
      const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.replace(destino);
    } catch (err: any) {
      setErro(err.message || "Erro de rede.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">Acesso restrito</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="senha" className="text-xs font-semibold text-muted-foreground">
          Senha
        </label>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={enviando}
        />
        {erro && <p className="text-xs font-medium text-red-400">{erro}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={enviando || senha.length === 0}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Entrar
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
