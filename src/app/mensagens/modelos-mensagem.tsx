"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoEscolha } from "@/components/ui/campo-escolha";
import { MARCAS, MOMENTOS, type Momento } from "@/lib/mensagens";
import type { ModeloSerializado } from "@/lib/mensagens-servico";

const caixa = "w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

function Cartao({ inicial, aoSalvar }: { inicial: Omit<ModeloSerializado, "id"> & { id?: string }; aoSalvar?: () => void }) {
  const router = useRouter();
  const [m, setM] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pending, start] = useTransition();
  const novo = !m.id;

  function salvar() {
    setMsg(null);
    start(async () => {
      const res = await fetch(novo ? "/api/mensagens" : `/api/mensagens/${m.id}`, {
        method: novo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: m.nome, momento: m.momento, texto: m.texto }),
      }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) return setMsg({ ok: false, texto: d?.error ?? "Não foi possível salvar." });
      setMsg({ ok: true, texto: "Salvo." });
      aoSalvar?.();
      router.refresh();
    });
  }

  function apagar() {
    if (!m.id || !confirm(`Apagar a mensagem "${m.nome}"?`)) return;
    start(async () => {
      await fetch(`/api/mensagens/${m.id}`, { method: "DELETE" }).catch(() => null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</span>
          <input className={`${caixa} h-10`} value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quando aparece</span>
          <CampoEscolha value={m.momento} onChange={(e) => setM({ ...m, momento: e.target.value as Momento })}>
            {MOMENTOS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </CampoEscolha>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Texto</span>
        <textarea className={`${caixa} h-36 py-2`} value={m.texto} onChange={(e) => setM({ ...m, texto: e.target.value })} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {msg && <p className={`mr-auto text-xs ${msg.ok ? "text-emerald-400" : "text-rose-300"}`}>{msg.texto}</p>}
        {!novo && (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-rose-300" disabled={pending} onClick={apagar}>
            <Trash2 /> Apagar
          </Button>
        )}
        <Button type="button" size="sm" disabled={pending} onClick={salvar}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar
        </Button>
      </div>
    </section>
  );
}

export function ModelosMensagem({ modelos }: { modelos: ModeloSerializado[] }) {
  const [criando, setCriando] = useState(false);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">O app troca sozinho:</p>
        <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {MARCAS.map((x) => (
            <li key={x.marca}>
              <code className="text-primary">{x.marca}</code> {x.ajuda}
            </li>
          ))}
        </ul>
      </div>
      {modelos.map((m) => (
        <Cartao key={`${m.id}-${m.texto.length}`} inicial={m} />
      ))}
      {criando ? (
        <Cartao inicial={{ nome: "", momento: "SEMPRE", texto: "Olá, {nome}! " }} aoSalvar={() => setCriando(false)} />
      ) : (
        <Button type="button" variant="outline" onClick={() => setCriando(true)}>
          <Plus /> Nova mensagem
        </Button>
      )}
    </div>
  );
}
