import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { sugestoesAudiencia } from "@/lib/audiencias";
import { AudienciaForm } from "@/components/forms/audiencia-form";
import { usuarioAtual } from "@/lib/usuario-atual";
import { veValores } from "@/lib/perfis";
import { sugestoesSemPix } from "@/lib/acesso-dados";

export const dynamic = "force-dynamic";

export default async function NovaAudienciaPage() {
  const eu = await usuarioAtual();
  const sugestoes = await sugestoesAudiencia();
  return (
    <div className="space-y-4">
      <Link href="/audiencias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Audiências
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Nova audiência</h1>
      <AudienciaForm semValores={!veValores(eu.perfil)} sugestoes={sugestoesSemPix(sugestoes, eu.perfil)} />
    </div>
  );
}
