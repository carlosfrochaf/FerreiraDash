import { prisma } from "@/lib/prisma";
import { dataDoDb } from "@/lib/datas";
import { OABS } from "@/lib/intimacoes-servico";
import { AdvogadosTabs } from "@/components/layout/advogados-tabs";
import { IntimacoesLista, type IntimacaoTela } from "./intimacoes-lista";

export const dynamic = "force-dynamic";

export default async function IntimacoesPage() {
  const lista = await prisma.intimacao.findMany({ orderBy: [{ data: "desc" }, { createdAt: "desc" }], take: 300 });
  const intimacoes: IntimacaoTela[] = lista.map((i) => ({
    id: i.id,
    data: dataDoDb(i.data),
    tipo: i.tipo,
    processo: i.processoMascara ?? i.numeroProcesso,
    orgao: i.orgao,
    texto: i.texto,
    link: i.link,
    cliente: i.clienteNome,
    lida: !!i.lidaEm,
  }));
  return (
    <div className="space-y-5">
      <AdvogadosTabs />
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Intimações</h1>
        <p className="text-sm text-muted-foreground">
          Publicadas no Diário de Justiça Eletrônico Nacional para a OAB {OABS.map((o) => `${o.numero}/${o.uf}`).join(", ")}. O app confere
          de hora em hora (8h30 às 19h30, dias úteis) e avisa no celular assim que chega uma nova.
        </p>
      </section>
      <IntimacoesLista intimacoes={intimacoes} />
    </div>
  );
}
