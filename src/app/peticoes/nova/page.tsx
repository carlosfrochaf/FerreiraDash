import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { sugestoesAudiencia } from "@/lib/audiencias";
import { PeticaoForm } from "@/components/forms/peticao-form";

export const dynamic = "force-dynamic";

export default async function NovaPeticaoPage() {
  const sugestoes = await sugestoesAudiencia();
  return (
    <div className="space-y-4">
      <Link href="/peticoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Petições
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Nova petição</h1>
      <PeticaoForm sugestoes={sugestoes} />
    </div>
  );
}
