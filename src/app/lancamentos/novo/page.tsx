import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { FormWrapper } from "@/components/forms/form-wrapper";
import { prisma } from "@/lib/prisma";
import { sugestoesAudiencia } from "@/lib/audiencias";

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

async function LancamentoPageContent({ editId, modo }: { editId?: string; modo: "causa" | "audiencia" | "peticao" | "simples" }) {
  const [{ processos, contatos, categorias }, sugestoes, transacaoEdicao] = await Promise.all([
    getFormData(),
    sugestoesAudiencia(),
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
    <FormWrapper
      processos={processos}
      contatos={contatos}
      categorias={categorias}
      transacaoEdicao={transacaoEdicao ?? undefined}
      modoInicial={modo}
      sugestoesAudiencia={sugestoes}
    />
  );
}

function FormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-16 max-w-lg animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}

export default async function NovoLancamentoPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const editId = typeof searchParams.edit === "string" ? searchParams.edit : undefined;
  const modo =
    searchParams.modo === "simples" || searchParams.tipo ? "simples" : searchParams.modo === "audiencia" ? "audiencia" : searchParams.modo === "peticao" ? "peticao" : "causa";

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {editId ? "Editar lançamento" : "Novo lançamento"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {editId ? "Atualize os dados deste lançamento" : "Causa, audiência, petição ou outro lançamento"}
        </p>
      </section>
      <Suspense fallback={<FormFallback />}>
        <LancamentoPageContent editId={editId} modo={modo} />
      </Suspense>
    </div>
  );
}
