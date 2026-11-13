import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/usuario-atual";
import { advogadosConhecidos } from "@/lib/usuarios";
import { serializarCliente } from "@/lib/clientes-servico";
import { serializarFicha } from "@/lib/fichas-servico";
import { podeEditarFicha } from "@/lib/ficha";
import { FichaForm } from "@/components/fichas/ficha-form";

export const dynamic = "force-dynamic";

export default async function FichaPage({ params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const eu = await usuarioAtual();
  const { id, fichaId } = await params;
  const f = await prisma.ficha.findFirst({
    where: { id: fichaId, clienteId: id },
    include: { cliente: { include: { documentos: { select: { tipo: true } }, recebimentos: { select: { id: true, reclamada: true } } } } },
  });
  if (!f) notFound();
  const advogados = await advogadosConhecidos();
  const veCausas = eu.perfil === "DONO" || eu.perfil === "SECRETARIA";

  return (
    <div className="space-y-4">
      <Link href={`/clientes/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {f.cliente.nome}
      </Link>
      <FichaForm
        ficha={serializarFicha(f)}
        cliente={serializarCliente(f.cliente)}
        advogados={advogados}
        tiposEnviados={[...new Set(f.cliente.documentos.map((d) => d.tipo))]}
        causas={veCausas ? f.cliente.recebimentos.map((r, i) => ({ id: r.id, titulo: r.reclamada ? `Causa × ${r.reclamada}` : `Causa ${i + 1}` })) : null}
        podeEditar={podeEditarFicha(eu, f)}
        podeTrocarAdvogado={eu.perfil !== "ADVOGADO"}
      />
    </div>
  );
}
