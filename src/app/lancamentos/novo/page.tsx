import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { LancamentoForm } from "@/components/forms/lancamento-form";
import { prisma } from "@/lib/prisma";

async function getFormData() {
  const [processos, contatos, categorias] = await Promise.all([
    prisma.processo.findMany({
      where: { ativo: true },
      include: { cliente: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.contato.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      take: 100,
    }),
    prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return {
    processos: processos.map((p) => ({
      id: p.id,
      numeroPje: p.numeroPje,
      nomeAcao: p.nomeAcao,
      clienteNome: p.cliente.nome,
    })),
    contatos: contatos.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
    })),
    categorias: categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
    })),
  };
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function LancamentoPageContent({ editId }: { editId?: string }) {
  const [{ processos, contatos, categorias }, transacaoEdicao] = await Promise.all([
    getFormData(),
    editId
      ? prisma.transacao.findUnique({
          where: { id: editId },
        }).then((t) =>
          t
            ? {
                id: t.id,
                tipo: t.tipo,
                categoriaId: t.categoriaId,
                valor: Number(t.valor),
                dataCompetencia: t.dataCompetencia.toISOString().slice(0, 10),
                dataPagamento: t.dataPagamento ? t.dataPagamento.toISOString().slice(0, 10) : "",
                status: t.status,
                descricao: t.descricao ?? "",
                processoId: t.processoId ?? "",
                contatoId: t.contatoId ?? "",
                processoNumero: t.processoNumero ?? "",
                clienteNome: t.clienteNome ?? "",
                reclamada: t.reclamada ?? "",
              }
            : null
        )
      : Promise.resolve(null),
  ]);

  return (
    <LancamentoForm
      processos={processos}
      contatos={contatos}
      categorias={categorias}
      transacaoEdicao={transacaoEdicao ?? undefined}
    />
  );
}

function FormFallback() {
  return <p className="text-muted-foreground">Carregando formulário...</p>;
}

export default async function NovoLancamentoPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const editId = typeof searchParams.edit === "string" ? searchParams.edit : undefined;

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {editId ? "Editar Lançamento" : "Lançamento"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {editId ? "Atualize os dados e o comprovante deste lançamento" : "Registre entradas e saídas com comprovante"}
        </p>
      </section>
      <Suspense fallback={<FormFallback />}>
        <LancamentoPageContent editId={editId} />
      </Suspense>
    </div>
  );
}
