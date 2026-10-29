import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializarAudiencia, sugestoesAudiencia } from "@/lib/audiencias";
import { AudienciaForm } from "@/components/forms/audiencia-form";

export const dynamic = "force-dynamic";

export default async function EditarAudienciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, sugestoes] = await Promise.all([prisma.audiencia.findUnique({ where: { id } }), sugestoesAudiencia()]);
  if (!a) notFound();

  return (
    <div className="space-y-4">
      <Link href="/audiencias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Audiências
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Editar audiência</h1>
      <AudienciaForm sugestoes={sugestoes} inicial={serializarAudiencia(a, sugestoes.pixAdvogados)} />
    </div>
  );
}
