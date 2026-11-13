"use client";

import {
  WhatsappCliente,
  type ContextoWhatsapp,
} from "@/components/clientes/whatsapp-cliente";
import type { ModeloSerializado } from "@/lib/mensagens-servico";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoEscolha } from "@/components/ui/campo-escolha";
import { Card, CardContent } from "@/components/ui/card";
import { ClienteForm } from "@/components/clientes/cliente-form";
import {
  DocumentosCliente,
  type DocumentoDaFicha,
} from "@/components/documentos/documentos-cliente";
import {
  FichasDoCliente,
  type FichaResumo,
} from "@/components/fichas/fichas-do-cliente";
import { formatCurrency } from "@/lib/utils";
import { formatarData, formatarDataCurta } from "@/lib/datas";
import { linkWhatsApp } from "@/lib/clientes";
import { resumoCausa } from "@/lib/resumo-causa";
import type { ClienteSerializado } from "@/lib/clientes-servico";
import type { RecebimentoSerializado } from "@/lib/recebimentos";

type Item = {
  id: string;
  advogadoNome: string;
  valor: number | null;
  paga: boolean;
};

export function FichaCliente({
  cliente,
  causas,
  audiencias,
  peticoes,
  documentos,
  outrosClientes,
  storagePronto,
  podeEditar = true,
  mostrarValores = true,
  fichas = [],
  podeCriarFicha = false,
  podeEnviarDocs = podeEditar,
  apagaSoOsMeus,
  mostrarCausas = true,
  mensagens,
}: {
  cliente: ClienteSerializado;
  causas: RecebimentoSerializado[];
  audiencias: (Item & { data: string; hora: string | null })[];
  peticoes: (Item & { descricao: string; dataEntrega: string })[];
  documentos: DocumentoDaFicha[];
  outrosClientes: { id: string; nome: string }[];
  storagePronto: boolean;
  podeEditar?: boolean;
  mostrarValores?: boolean;
  fichas?: FichaResumo[];
  podeCriarFicha?: boolean;
  podeEnviarDocs?: boolean;
  apagaSoOsMeus?: string;
  mostrarCausas?: boolean;
  /** Mensagens prontas (dono e secretária). Sem isso, o botão só abre o WhatsApp. */
  mensagens?: {
    modelos: ModeloSerializado[];
    ctx: ContextoWhatsapp;
    escritorio: string;
    abrir: boolean;
  };
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [origem, setOrigem] = useState("");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();
  const whatsapp = cliente.telefone ? linkWhatsApp(cliente.telefone) : null;
  const titulos = causas.map((c, i) => ({
    id: c.id,
    titulo: c.reclamada
      ? `Causa × ${c.reclamada}`
      : mostrarValores
        ? `Causa de ${formatCurrency(Number(c.valorTotal))}`
        : `Causa ${i + 1}`,
  }));

  function juntar() {
    const outro = outrosClientes.find((o) => o.id === origem);
    if (!outro) return;
    if (
      !confirm(
        `Juntar "${outro.nome}" em "${cliente.nome}"? Causas, audiências, petições e documentos de "${outro.nome}" passam para cá e o cadastro dele some.`,
      )
    )
      return;
    setErro("");
    startTransition(async () => {
      const res = await fetch(`/api/clientes/${cliente.id}/juntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origemId: origem }),
      }).catch(() => null);
      if (!res?.ok) {
        const d = await res?.json().catch(() => ({}));
        return setErro(
          typeof d?.error === "string" ? d.error : "Não foi possível juntar.",
        );
      }
      setOrigem("");
      router.refresh();
    });
  }

  const dados: [string, string | null][] = [
    ["CPF", cliente.cpf],
    ["Telefone", cliente.telefone],
    ["E-mail", cliente.email],
    [
      "Nascimento",
      cliente.dataNascimento ? formatarData(cliente.dataNascimento) : null,
    ],
    ["Estado civil", cliente.estadoCivil],
    ["Endereço", cliente.endereco],
    ["CEP", cliente.cep],
    ["Cidade/UF", cliente.cidadeUf],
    ["Como chegou", cliente.origem],
    ["Pix", mostrarCausas ? cliente.pix : null], // advogado não vê o Pix do cliente
    ["Observações", cliente.observacoes],
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{cliente.nome}</h1>
        <div className="flex gap-2">
          {whatsapp && mensagens && cliente.telefone ? (
            <WhatsappCliente
              telefone={cliente.telefone}
              nome={cliente.nome}
              escritorio={mensagens.escritorio}
              modelos={mensagens.modelos}
              ctx={mensagens.ctx}
              abrirAoCarregar={mensagens.abrir}
            />
          ) : (
            whatsapp && (
              <Button asChild variant="outline" size="sm">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle /> WhatsApp
                </a>
              </Button>
            )
          )}
          {podeEditar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditando((v) => !v)}
            >
              <Pencil /> {editando ? "Fechar" : "Editar dados"}
            </Button>
          )}
        </div>
      </section>

      {editando ? (
        <ClienteForm inicial={cliente} onSalvo={() => setEditando(false)} />
      ) : (
        <Card>
          <CardContent className="grid gap-x-4 gap-y-2 p-4 text-sm sm:grid-cols-2">
            {dados
              .filter(([r]) => mostrarCausas || r !== "Pix")
              .map(([rotulo, valor]) => (
                <div key={rotulo} className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {rotulo}
                  </p>
                  <p
                    className={valor ? "break-words" : "text-muted-foreground"}
                  >
                    {valor || "—"}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <DocumentosCliente
        clienteId={cliente.id}
        documentos={documentos}
        causas={titulos}
        storagePronto={storagePronto}
        podeEditar={podeEnviarDocs}
        apagaSoOsMeus={apagaSoOsMeus}
        cpf={cliente.cpf}
      />

      <FichasDoCliente
        clienteId={cliente.id}
        fichas={fichas}
        podeCriar={podeCriarFicha}
      />

      {mostrarCausas && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Causas
          </h2>
          {causas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma causa.</p>
          ) : (
            causas.map((c) => {
              const r = resumoCausa(c.parcelas);
              return mostrarValores ? (
                <Link
                  key={c.id}
                  href={`/recebimentos/${c.id}/editar`}
                  className="block rounded-xl border border-border bg-card p-3 hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {c.reclamada || "Empresa não informada"}
                    </p>
                    <p className="shrink-0 text-sm font-bold tabular-nums">
                      {formatCurrency(Number(c.valorTotal))}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.numeroParcelas}x · escritório{" "}
                    {formatCurrency(r.escritorio.recebido)} recebido, falta{" "}
                    {formatCurrency(r.escritorio.falta)} · cliente falta{" "}
                    {formatCurrency(r.cliente.falta)}
                  </p>
                </Link>
              ) : (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <p className="truncate text-sm font-semibold">
                    {c.reclamada || "Empresa não informada"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.processoNumero
                      ? `Proc. ${c.processoNumero}`
                      : "Sem número de processo"}
                  </p>
                </div>
              );
            })
          )}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Audiências
          </h2>
          {audiencias.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma audiência.</p>
          ) : (
            audiencias.map((a) => (
              <Link
                key={a.id}
                href={`/audiencias/${a.id}/editar`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm hover:bg-accent/40"
              >
                <span className="min-w-0 truncate">
                  {formatarDataCurta(a.data)}
                  {a.hora ? ` ${a.hora}` : ""} · {a.advogadoNome}
                </span>
                {mostrarValores && (
                  <span
                    className={a.paga ? "text-emerald-400" : "text-amber-300"}
                  >
                    {a.valor ? formatCurrency(a.valor) : "sem valor"}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Petições
          </h2>
          {peticoes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma petição.</p>
          ) : (
            peticoes.map((p) => (
              <Link
                key={p.id}
                href={`/peticoes/${p.id}/editar`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm hover:bg-accent/40"
              >
                <span className="min-w-0 truncate">
                  {p.descricao} · {p.advogadoNome}
                </span>
                {mostrarValores && (
                  <span
                    className={p.paga ? "text-emerald-400" : "text-amber-300"}
                  >
                    {p.valor ? formatCurrency(p.valor) : "sem valor"}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </section>

      {podeEditar && outrosClientes.length > 0 && (
        <section className="space-y-2 rounded-xl border border-border p-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4" /> Juntar com outro cadastro
          </h2>
          <p className="text-xs text-muted-foreground">
            Use quando o mesmo cliente foi cadastrado duas vezes (ex.: nome
            escrito diferente).
          </p>
          <div className="flex gap-2">
            <CampoEscolha
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="flex-1"
              aria-label="Cliente duplicado"
            >
              <option value="">Escolha o cadastro duplicado…</option>
              {outrosClientes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </CampoEscolha>
            <Button
              type="button"
              variant="outline"
              disabled={!origem || pending}
              onClick={juntar}
            >
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ExternalLink className="rotate-90" />
              )}{" "}
              Juntar
            </Button>
          </div>
          {erro && <p className="text-xs text-rose-300">{erro}</p>}
        </section>
      )}
    </div>
  );
}
