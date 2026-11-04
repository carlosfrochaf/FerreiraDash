import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { documentosFaltando } from "@/lib/documentos";
import { ClientesLista, type ClienteDaLista } from "./clientes-lista";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { recebimentos: true, audiencias: true, peticoes: true } },
      recebimentos: { select: { id: true } },
      documentos: { select: { tipo: true, recebimentoId: true } },
    },
  });

  const lista: ClienteDaLista[] = clientes.map((c) => {
    const f = documentosFaltando(c.documentos, c.recebimentos);
    const falta = f.pessoais.length + Object.values(f.porCausa).reduce((s, l) => s + l.length, 0);
    return {
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      telefone: c.telefone,
      causas: c._count.recebimentos,
      audiencias: c._count.audiencias,
      peticoes: c._count.peticoes,
      documentosFaltando: falta,
    };
  });

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Dados, causas e documentos de cada cliente</p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo cliente
        </Link>
      </section>
      <ClientesLista clientes={lista} />
    </div>
  );
}
