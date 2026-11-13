import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/usuario-atual";
import { formatarData } from "@/lib/datas";
import { ID_ZAPSIGN } from "@/lib/zapsign-servico";
import { ZapsignCard } from "./zapsign-card";

export const dynamic = "force-dynamic";

export default async function IntegracoesPage() {
  await usuarioAtual();
  const z = await prisma.integracao.findUnique({ where: { id: ID_ZAPSIGN }, select: { updatedAt: true } });
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">Ligue o app aos serviços que o escritório já usa. Tudo aqui é opcional.</p>
      </section>
      <ZapsignCard conectadoEm={z ? formatarData(z.updatedAt.toISOString().slice(0, 10)) : null} />
    </div>
  );
}
