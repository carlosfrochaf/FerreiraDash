import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { HistoricoContent } from "./historico-content";

export const dynamic = "force-dynamic";

async function getTransacoes() {
  const data = await prisma.transacao.findMany({
    orderBy: {
      dataCompetencia: "desc",
    },
    include: {
      categoria: true,
      processo: {
        include: {
          cliente: true,
        },
      },
      contato: true,
    },
  });

  // Convert decimal and dates to plain objects for safe client passing
  return data.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    valor: Number(t.valor),
    dataCompetencia: t.dataCompetencia.toISOString().slice(0, 10),
    dataPagamento: t.dataPagamento ? t.dataPagamento.toISOString().slice(0, 10) : "",
    status: t.status,
    descricao: t.descricao ?? "",
    processoNumero: t.processoNumero ?? "",
    clienteNome: t.clienteNome ?? "",
    reclamada: t.reclamada ?? "",
    anexoUrl: t.anexoUrl ?? "",
    anexoNome: t.anexoNome ?? "",
    categoria: {
      id: t.categoria.id,
      nome: t.categoria.nome,
      tipo: t.categoria.tipo,
    },
    processo: t.processo
      ? {
          id: t.processo.id,
          numeroPje: t.processo.numeroPje,
          nomeAcao: t.processo.nomeAcao,
          cliente: {
            id: t.processo.cliente.id,
            nome: t.processo.cliente.nome,
          },
        }
      : null,
    contato: t.contato
      ? {
          id: t.contato.id,
          nome: t.contato.nome,
          tipo: t.contato.tipo,
        }
      : null,
  }));
}

async function HistoricoList() {
  const transacoes = await getTransacoes();
  return <HistoricoContent initialTransacoes={transacoes} />;
}

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">Extrato completo de lançamentos e fluxo de caixa</p>
      </section>
      
      <Suspense fallback={<div className="text-muted-foreground py-12 text-center animate-pulse text-sm">Carregando extrato de transações...</div>}>
        <HistoricoList />
      </Suspense>
    </div>
  );
}
