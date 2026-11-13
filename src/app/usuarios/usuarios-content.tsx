"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoEscolha } from "@/components/ui/campo-escolha";
import { PERFIS, rotuloPerfil, type Perfil } from "@/lib/perfis";
import type { UsuarioPublico } from "@/lib/usuarios";

type Advogado = { chave: string; nome: string };

const O_QUE_VE: Record<Perfil, string> = {
  DONO: "Vê e faz tudo, inclusive cadastrar usuários.",
  FINANCEIRO: "Lançamentos, recebimentos, despesas, histórico e pagamento de advogados.",
  SECRETARIA: "Clientes, documentos, audiências e petições, sem valores.",
  ADVOGADO: "Só as audiências, petições e pagamentos dele.",
};

async function enviar(url: string, method: string, corpo: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  if (res?.ok) return null;
  const d = await res?.json().catch(() => ({}));
  return typeof d?.error === "string" ? d.error : "Não foi possível salvar.";
}

function EscolhaAdvogado({ valor, onChange, advogados }: { valor: string; onChange: (v: string) => void; advogados: Advogado[] }) {
  return (
    <CampoEscolha value={valor} onChange={(e) => onChange(e.target.value)} aria-label="Qual advogado">
      <option value="">Qual advogado é esta pessoa?</option>
      {advogados.map((a) => (
        <option key={a.chave} value={a.chave}>
          {a.nome}
        </option>
      ))}
    </CampoEscolha>
  );
}

function NovoUsuario({ advogados, onFeito }: { advogados: Advogado[]; onFeito: () => void }) {
  const [f, setF] = useState({ nome: "", email: "", senha: "", perfil: "SECRETARIA" as Perfil, advogadoChave: "" });
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    start(async () => {
      const r = await enviar("/api/usuarios", "POST", { ...f, advogadoChave: f.advogadoChave || null });
      if (r) return setErro(r);
      onFeito();
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Novo usuário</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Nome" value={f.nome} onChange={(e) => set("nome")(e.target.value)} className="h-10" />
        <Input placeholder="E-mail" type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} className="h-10" />
        <Input placeholder="Senha (mínimo 8)" type="password" autoComplete="new-password" value={f.senha} onChange={(e) => set("senha")(e.target.value)} className="h-10" />
        <CampoEscolha value={f.perfil} onChange={(e) => set("perfil")(e.target.value)} aria-label="Perfil">
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {rotuloPerfil(p)}
            </option>
          ))}
        </CampoEscolha>
        {f.perfil === "ADVOGADO" && <EscolhaAdvogado valor={f.advogadoChave} onChange={set("advogadoChave")} advogados={advogados} />}
      </div>
      <p className="text-xs text-muted-foreground">{O_QUE_VE[f.perfil]}</p>
      {erro && <p className="text-xs text-rose-300">{erro}</p>}
      <Button type="submit" disabled={pending || !f.nome || !f.email || f.senha.length < 8}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Criar usuário
      </Button>
    </form>
  );
}

function LinhaUsuario({ u, advogados, eu }: { u: UsuarioPublico; advogados: Advogado[]; eu: boolean }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  function mudar(corpo: Record<string, unknown>, confirmar?: string) {
    if (confirmar && !confirm(confirmar)) return;
    setErro("");
    start(async () => {
      const r = await enviar(`/api/usuarios/${u.id}`, "PATCH", corpo);
      if (r) return setErro(r);
      router.refresh();
    });
  }

  function novaSenha() {
    const senha = prompt(`Nova senha para ${u.nome} (mínimo 8 caracteres):`)?.trim();
    if (!senha) return;
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    mudar({ senha });
  }

  return (
    <li className={`space-y-2 px-4 py-3 ${u.ativo ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {u.nome} {eu && <span className="text-xs font-normal text-muted-foreground">(você)</span>}
            {!u.ativo && <span className="ml-1 text-xs font-normal text-rose-300">desativado</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={novaSenha} disabled={pending}>
            <KeyRound /> Senha
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => mudar({ ativo: !u.ativo }, u.ativo ? `Desativar ${u.nome}? Ela sai do app na hora.` : undefined)}
          >
            {u.ativo ? <UserX /> : <UserCheck />} {u.ativo ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <CampoEscolha value={u.perfil} disabled={pending} onChange={(e) => mudar({ perfil: e.target.value })} aria-label={`Perfil de ${u.nome}`}>
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {rotuloPerfil(p)}
            </option>
          ))}
        </CampoEscolha>
        {u.perfil === "ADVOGADO" && (
          <EscolhaAdvogado valor={u.advogadoChave ?? ""} onChange={(v) => v && mudar({ advogadoChave: v })} advogados={advogados} />
        )}
      </div>
      {erro && <p className="text-xs text-rose-300">{erro}</p>}
    </li>
  );
}

export function UsuariosContent({ usuarios, advogados, euId }: { usuarios: UsuarioPublico[]; advogados: Advogado[]; euId: string }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  return (
    <div className="space-y-4">
      {criando ? (
        <NovoUsuario
          advogados={advogados}
          onFeito={() => {
            setCriando(false);
            router.refresh();
          }}
        />
      ) : (
        <Button type="button" onClick={() => setCriando(true)}>
          <Plus /> Novo usuário
        </Button>
      )}
      <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
        {usuarios.map((u) => (
          <LinhaUsuario key={u.id} u={u} advogados={advogados} eu={u.id === euId} />
        ))}
      </ul>
    </div>
  );
}
