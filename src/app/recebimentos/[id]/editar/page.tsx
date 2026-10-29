import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ErroRecebimento, obterRecebimento, pixConhecidos } from "@/lib/recebimentos";
import { RecebimentoForm } from "@/components/forms/recebimento-form";

export const dynamic = "force-dynamic";

export default async function EditarCausaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [causa, processos, pix] = await Promise.all([
    obterRecebimento(id).catch((e) => {
      if (e instanceof ErroRecebimento && e.status === 404) return null;
      throw e;
    }),
    prisma.processo.findMany({ where: { ativo: true }, include: { cliente: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    pixConhecidos(),
  ]);
  if (!causa) notFound();

  return (
    <div className="space-y-4">
      <Link href="/recebimentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Recebimentos
      </Link>
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Editar causa</h1>
        <p className="text-sm text-muted-foreground">{causa.clienteNome}</p>
      </section>
      <RecebimentoForm
        inicial={causa}
        pixConhecidos={pix}
        processos={processos.map((p) => ({ id: p.id, numeroPje: p.numeroPje, nomeAcao: p.nomeAcao, clienteNome: p.cliente.nome }))}
      />
    </div>
  );
}
