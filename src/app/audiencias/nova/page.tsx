import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { sugestoesAudiencia } from "@/lib/audiencias";
import { AudienciaForm } from "@/components/forms/audiencia-form";

export const dynamic = "force-dynamic";

export default async function NovaAudienciaPage() {
  const sugestoes = await sugestoesAudiencia();
  return (
    <div className="space-y-4">
      <Link href="/audiencias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Audiências
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Nova audiência</h1>
      <AudienciaForm sugestoes={sugestoes} />
    </div>
  );
}
