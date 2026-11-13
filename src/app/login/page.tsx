"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Scale, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";

function Campo({ id, rotulo, ...props }: { id: string; rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      <Input id={id} {...props} />
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [primeiro, setPrimeiro] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/login/primeiro-acesso")
      .then((r) => r.json())
      .then((d) => setPrimeiro(!!d.liberado))
      .catch(() => setPrimeiro(false));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (primeiro && senha !== confirma) return setErro("As senhas não são iguais.");
    setEnviando(true);
    try {
      const res = await fetch(primeiro ? "/api/login/primeiro-acesso" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(primeiro ? { nome, email, senha } : { email, senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível entrar.");
      }
      // Só aceita destino interno, para não virar redirecionamento aberto.
      const next = searchParams.get("next");
      const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.replace(destino);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro de rede.");
      setEnviando(false);
    }
  }

  if (primeiro === null) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">{primeiro ? "Criar primeiro acesso" : "Acesso restrito"}</p>
        </div>
      </div>

      {primeiro && (
        <p className="rounded-lg bg-primary/10 p-2.5 text-xs text-primary">
          Ainda não há ninguém cadastrado. Crie o acesso do Dono/Sócio; depois ele cadastra o resto da equipe.
        </p>
      )}

      {primeiro && <Campo id="nome" rotulo="Seu nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} disabled={enviando} />}
      <Campo id="email" rotulo="E-mail" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando} />
      <Campo
        id="senha"
        rotulo={primeiro ? "Senha (mínimo 8 caracteres)" : "Senha"}
        type="password"
        autoComplete={primeiro ? "new-password" : "current-password"}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        disabled={enviando}
      />
      {primeiro && (
        <Campo id="confirma" rotulo="Repita a senha" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} disabled={enviando} />
      )}
      {erro && <p className="text-xs font-medium text-red-400">{erro}</p>}

      <Button type="submit" className="w-full" disabled={enviando || !email || !senha || (primeiro && !nome)}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : primeiro ? <UserPlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {primeiro ? "Criar e entrar" : "Entrar"}
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
