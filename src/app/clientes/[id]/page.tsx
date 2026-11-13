import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializarCliente } from "@/lib/clientes-servico";
import { serializarRecebimento } from "@/lib/recebimentos";
import { dataDoDb } from "@/lib/datas";
import { storageConfigurado } from "@/lib/storage";
import { FichaCliente } from "./ficha-cliente";
import { usuarioAtual } from "@/lib/usuario-atual";
import { editaClientes, veValores } from "@/lib/perfis";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  const { id } = await params;
  const c = await prisma.cliente.findUnique({
    where: { id },
    include: {
      recebimentos: { include: { parcelas: { orderBy: { numero: "asc" } } }, orderBy: { createdAt: "desc" } },
      audiencias: { orderBy: { data: "desc" } },
      peticoes: { orderBy: { dataEntrega: "desc" } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();
  const outros = await prisma.cliente.findMany({ where: { id: { not: id } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });

  return (
    <div className="space-y-4">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>
      <FichaCliente
        cliente={serializarCliente(c)}
        causas={c.recebimentos.map(serializarRecebimento)}
        audiencias={c.audiencias.map((a) => ({
          id: a.id,
          data: dataDoDb(a.data),
          hora: a.hora,
          advogadoNome: a.advogadoNome,
          valor: a.valor ? Number(a.valor) : null,
          paga: a.statusPagamento === "PAGO",
        }))}
        peticoes={c.peticoes.map((p) => ({
          id: p.id,
          descricao: p.descricao,
          dataEntrega: dataDoDb(p.dataEntrega),
          advogadoNome: p.advogadoNome,
          valor: p.valor ? Number(p.valor) : null,
          paga: p.status === "PAGA",
        }))}
        documentos={c.documentos.map((d) => ({
          id: d.id,
          tipo: d.tipo,
          nome: d.nome,
          mime: d.mime,
          tamanho: d.tamanho,
          recebimentoId: d.recebimentoId,
          enviadoEm: d.createdAt.toISOString(),
        }))}
        outrosClientes={outros}
        storagePronto={storageConfigurado()}
        podeEditar={editaClientes(eu.perfil)}
        mostrarValores={veValores(eu.perfil)}
      />
    </div>
  );
}
