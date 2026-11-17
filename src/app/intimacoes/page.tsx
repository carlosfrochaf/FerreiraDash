import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/usuario-atual";
import { dataDoDb } from "@/lib/datas";
import { filtroIntimacoesDoUsuario } from "@/lib/intimacoes-acesso";
import { IntimacoesLista, type IntimacaoTela } from "./intimacoes-lista";

export const dynamic = "force-dynamic";

export default async function IntimacoesPage() {
  const eu = await usuarioAtual();
  const [lista, oabs] = await Promise.all([
    prisma.intimacao.findMany({
      where: filtroIntimacoesDoUsuario(eu),
      orderBy: [{ data: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { cliente: { select: { id: true, nome: true } } },
    }),
    prisma.oabAcompanhada.findMany({ orderBy: { createdAt: "asc" }, select: { numero: true, uf: true } }),
  ]);
  const intimacoes: IntimacaoTela[] = lista.map((i) => ({
    id: i.id,
    data: dataDoDb(i.data),
    tipo: i.tipo,
    processo: i.processoMascara ?? i.numeroProcesso,
    orgao: i.orgao,
    texto: i.texto,
    link: i.link,
    cliente: i.cliente,
    lida: !!i.lidaEm,
  }));
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Intimações</h1>
        <p className="text-sm text-muted-foreground">
          {oabs.length > 0
            ? `Publicadas no Diário de Justiça Eletrônico Nacional para a OAB ${oabs.map((o) => `${o.numero}/${o.uf}`).join(", ")}. O app busca todo dia de manhã.`
            : "Nenhuma OAB cadastrada ainda. O dono cadastra em Ajustes → Integrações."}
        </p>
      </section>
      <IntimacoesLista intimacoes={intimacoes} temOab={oabs.length > 0} />
    </div>
  );
}
