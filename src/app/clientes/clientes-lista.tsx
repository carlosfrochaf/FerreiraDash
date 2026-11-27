"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  chaveCliente,
  contar,
  mascararCpf,
  nomeExibicao,
  telefoneExibicao,
} from "@/lib/clientes";

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
        (digitos.length >= 3 &&
          ((c.cpf ?? "").replace(/\D/g, "").includes(digitos) ||
            (c.telefone ?? "").replace(/\D/g, "").includes(digitos))),
    );
  }, [clientes, busca]);

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Users className="mb-3 h-9 w-9 text-muted-foreground" />
        <p className="font-semibold">Nenhum cliente ainda</p>
        <p className="text-xs text-muted-foreground">
          Os clientes das causas aparecem aqui sozinhos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nome, CPF ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 md:h-9 pl-10"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {clientes.length} clientes
      </p>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
        <li
          aria-hidden
          className={`hidden gap-4 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid ${COLUNAS}`}
        >
          <span>Nome</span>
          <span>CPF</span>
          <span>Telefone</span>
          <span className="text-center">Audiências</span>
          <span className="text-center">Petições</span>
          <span>Documentos</span>
        </li>
        {filtrados.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clientes/${c.id}`}
              className={`hidden items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-accent/40 md:grid ${COLUNAS}`}
            >
              <span className="truncate font-medium">
                {nomeExibicao(c.nome)}
              </span>
              <span className="truncate tabular-nums text-muted-foreground">
                {c.cpf ? mascararCpf(c.cpf) : "—"}
              </span>
              <span className="truncate tabular-nums text-muted-foreground">
                {c.telefone ? telefoneExibicao(c.telefone) : "—"}
              </span>
              <span className="text-center tabular-nums">
                {c.audiencias || "—"}
              </span>
              <span className="text-center tabular-nums">
                {c.peticoes || "—"}
              </span>
              <span
                className={
                  c.documentosFaltando > 0
                    ? "text-xs text-amber-300/90"
                    : "text-xs text-muted-foreground"
                }
              >
                {c.documentosFaltando > 0
                  ? contar(c.documentosFaltando, "faltando", "faltando")
                  : "Completos"}
              </span>
            </Link>
            <Link
              href={`/clientes/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 md:hidden"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{nomeExibicao(c.nome)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    c.cpf ? `CPF ${mascararCpf(c.cpf)}` : "",
                    c.telefone ? telefoneExibicao(c.telefone) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem CPF e telefone"}
                </p>
                {(c.causas > 0 ||
                  c.audiencias > 0 ||
                  c.peticoes > 0 ||
                  c.documentosFaltando > 0) && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {[
                      c.causas > 0 && contar(c.causas, "causa", "causas"),
                      c.audiencias > 0 &&
                        contar(c.audiencias, "audiência", "audiências"),
                      c.peticoes > 0 &&
                        contar(c.peticoes, "petição", "petições"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {c.documentosFaltando > 0 && (
                      <span className="text-amber-300/90">
                        {c.causas > 0 || c.audiencias > 0 || c.peticoes > 0
                          ? " · "
                          : ""}
                        {contar(
                          c.documentosFaltando,
                          "documento faltando",
                          "documentos faltando",
                        )}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COLUNAS = "grid-cols-[minmax(0,2fr)_9rem_9rem_5.5rem_4.5rem_7rem]";
