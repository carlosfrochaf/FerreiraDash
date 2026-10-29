import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sugestoesAudiencia } from "@/lib/audiencias";
import { serializarPeticao } from "@/lib/peticoes";
import { PeticaoForm } from "@/components/forms/peticao-form";

export const dynamic = "force-dynamic";

export default async function EditarPeticaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, sugestoes] = await Promise.all([prisma.peticao.findUnique({ where: { id } }), sugestoesAudiencia()]);
  if (!p) notFound();
  return (
    <div className="space-y-4">
      <Link href="/peticoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Petições
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Editar petição</h1>
      <PeticaoForm sugestoes={sugestoes} inicial={serializarPeticao(p, sugestoes.pixAdvogados)} />
    </div>
  );
}
