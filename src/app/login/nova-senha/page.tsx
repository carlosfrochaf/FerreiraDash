"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoRotulado } from "@/components/ui/campo-senha";
import { APP_NAME } from "@/lib/constants";

function NovaSenhaForm() {
  const t = useSearchParams().get("t") ?? "";
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As senhas não são iguais.");
    setEnviando(true);
    const res = await fetch("/api/login/nova-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t, senha }),
    }).catch(() => null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setEnviando(false);
      return setErro(d?.error ?? "Não foi possível trocar agora. Tente de novo.");
    }
    window.location.replace("/login?senha=trocada");
  }

  return (
    <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
      <div>
        <p className="text-sm font-semibold">{APP_NAME}</p>
        <h1 className="text-lg font-bold">Criar nova senha</h1>
      </div>
      {!t ? (
        <p className="text-sm text-muted-foreground">Link incompleto. Abra de novo o link do e-mail.</p>
      ) : (
        <>
          <CampoRotulado id="senha" rotulo="Nova senha (mínimo 8 caracteres)" type="password" autoComplete="new-password" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} disabled={enviando} />
          <CampoRotulado id="confirma" rotulo="Repita a nova senha" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} disabled={enviando} />
          {erro && <p className="text-xs font-medium text-red-400">{erro}</p>}
          <Button type="submit" className="w-full" disabled={enviando || !senha || !confirma}>
            {enviando ? <Loader2 className="animate-spin" /> : <KeyRound />} Salvar nova senha
          </Button>
        </>
      )}
      <Link href="/login/esqueci" className="block text-center text-xs font-medium text-muted-foreground hover:text-primary">
        Pedir outro link
      </Link>
    </form>
  );
}

export default function NovaSenhaPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <NovaSenhaForm />
      </Suspense>
    </div>
  );
}
