import { RepasseForm } from "@/components/forms/repasse-form";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export default async function RepassePage() {
  const processos = await prisma.processo.findMany({
    where: { ativo: true },
    include: { cliente: true },
    orderBy: { updatedAt: "desc" },
  });

  const options = processos.map((p) => ({
    id: p.id,
    numeroPje: p.numeroPje,
    nomeAcao: p.nomeAcao,
    clienteNome: p.cliente.nome,
  }));

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Repasse Jurídico</h1>
        <p className="text-sm text-muted-foreground">
          Cálculo automático entre honorários do escritório e repasse ao cliente
        </p>
      </section>
      <RepasseForm processos={options} />
    </div>
  );
}
