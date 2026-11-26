"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cpfValido } from "@/lib/clientes";
import type { ClienteSerializado } from "@/lib/clientes-servico";

/** "52998224725" → "529.982.247-25" enquanto digita. */
function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function ClienteForm({ inicial, onSalvo }: { inicial?: ClienteSerializado; onSalvo?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [c, setC] = useState({
    nome: inicial?.nome ?? "",
    cpf: inicial?.cpf ?? "",
    telefone: inicial?.telefone ?? "",
    email: inicial?.email ?? "",
    dataNascimento: inicial?.dataNascimento ?? "",
    endereco: inicial?.endereco ?? "",
    pix: inicial?.pix ?? "",
    observacoes: inicial?.observacoes ?? "",
  });
  const campo = (k: keyof typeof c) => ({
    id: `cli-${k}`,
    value: c[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: k === "cpf" ? mascaraCpf(e.target.value) : e.target.value }),
    className: "h-11",
  });
  const avisoCpf = c.cpf.replace(/\D/g, "").length === 11 && !cpfValido(c.cpf) ? "Confira o CPF: os dígitos não batem." : "";

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!c.nome.trim()) return setErro("Informe o nome do cliente.");
    startTransition(async () => {
      const res = await fetch(inicial ? `/api/clientes/${inicial.id}` : "/api/clientes", {
        method: inicial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) return setErro(typeof d?.error === "string" ? d.error : "Não foi possível salvar.");
      if (inicial) {
        onSalvo?.();
        router.refresh();
      } else {
        router.push(`/clientes/${d.id}`);
      }
    });
  }

  return (
    <form onSubmit={salvar} noValidate>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cli-nome">
              Nome <span className="text-rose-400">*</span>
            </Label>
            <Input {...campo("nome")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-cpf">CPF</Label>
            <Input {...campo("cpf")} inputMode="numeric" placeholder="000.000.000-00" />
            {avisoCpf && <p className="text-xs text-amber-300">{avisoCpf}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-dataNascimento">Data de nascimento</Label>
            <Input {...campo("dataNascimento")} type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-telefone">Telefone / WhatsApp</Label>
            <Input {...campo("telefone")} inputMode="tel" placeholder="(31) 98765-4321" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-email">E-mail</Label>
            <Input {...campo("email")} type="email" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cli-endereco">Endereço</Label>
            <Input {...campo("endereco")} placeholder="Rua, número, bairro, cidade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-pix">Chave Pix</Label>
            <Input {...campo("pix")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-observacoes">Observações</Label>
            <Input {...campo("observacoes")} />
          </div>
          {erro && <p className="text-sm text-rose-400 sm:col-span-2">{erro}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />} Salvar cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
