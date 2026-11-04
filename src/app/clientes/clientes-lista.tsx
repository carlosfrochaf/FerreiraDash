"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { chaveCliente, mascararCpf } from "@/lib/clientes";

export type ClienteDaLista = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  causas: number;
  audiencias: number;
  peticoes: number;
  documentosFaltando: number;
};

export function ClientesLista({ clientes }: { clientes: ClienteDaLista[] }) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const q = chaveCliente(busca);
    const digitos = busca.replace(/\D/g, "");
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        chaveCliente(c.nome).includes(q) ||
        (digitos.length >= 3 && ((c.cpf ?? "").replace(/\D/g, "").includes(digitos) || (c.telefone ?? "").replace(/\D/g, "").includes(digitos)))
    );
  }, [clientes, busca]);

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Users className="mb-3 h-9 w-9 text-muted-foreground" />
        <p className="font-semibold">Nenhum cliente ainda</p>
        <p className="text-xs text-muted-foreground">Os clientes das causas aparecem aqui sozinhos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Nome, CPF ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-11 pl-10" />
      </div>
      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {clientes.length} clientes
      </p>
      <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
        {filtrados.map((c) => (
          <li key={c.id}>
            <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.cpf ? `CPF ${mascararCpf(c.cpf)}` : "", c.telefone ?? ""].filter(Boolean).join(" · ") || "Sem CPF e telefone"}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  {c.causas > 0 && <span className="rounded-md bg-muted px-1.5 py-0.5">{c.causas} causa(s)</span>}
                  {c.audiencias > 0 && <span className="rounded-md bg-muted px-1.5 py-0.5">{c.audiencias} audiência(s)</span>}
                  {c.peticoes > 0 && <span className="rounded-md bg-muted px-1.5 py-0.5">{c.peticoes} petição(ões)</span>}
                  {c.documentosFaltando > 0 && (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-300">Faltam documentos</span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
