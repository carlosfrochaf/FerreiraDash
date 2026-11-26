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
import { advogadosConhecidos } from "@/lib/usuarios";
import { listarModelos } from "@/lib/mensagens-servico";
import { contextoWhatsapp } from "@/lib/mensagens-cliente";
import { APP_NAME } from "@/lib/constants";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { filtroDoUsuario } from "@/lib/acesso-dados";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ avisar?: string }> }) {
  const eu = await usuarioAtual();
  const { id } = await params;
  const advogado = eu.perfil === "ADVOGADO";
  const so = filtroDoUsuario(eu);
  // Cliente que a pessoa não pode ver é tratado como inexistente.
  const c = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesDoUsuario(eu) },
    include: {
      recebimentos: { include: { parcelas: { orderBy: { numero: "asc" } } }, orderBy: { createdAt: "desc" } },
      audiencias: { where: so, orderBy: { data: "desc" } },
      peticoes: { where: so, orderBy: { dataEntrega: "desc" } },
      documentos: { orderBy: { createdAt: "desc" } },
      fichas: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();
  const advogados = new Map((await advogadosConhecidos()).map((a) => [a.chave, a.nome]));
  const mensagens = editaClientes(eu.perfil)
    ? { modelos: await listarModelos(), ctx: contextoWhatsapp(c), escritorio: APP_NAME, abrir: (await searchParams).avisar === "1" }
    : undefined;
  const outros = editaClientes(eu.perfil)
    ? await prisma.cliente.findMany({ where: { id: { not: id } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
    : [];

  return (
    <div className="space-y-4">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>
      <FichaCliente
        cliente={serializarCliente(c)}
        causas={advogado ? [] : c.recebimentos.map(serializarRecebimento)}
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
          enviadoPorId: d.enviadoPorId,
        }))}
        outrosClientes={outros}
        storagePronto={storageConfigurado()}
        podeEditar={editaClientes(eu.perfil)}
        mostrarValores={veValores(eu.perfil) && !advogado}
        fichas={c.fichas.map((f) => ({
          id: f.id,
          empresa: f.empresa,
          advogadoNome: f.advogadoChave ? (advogados.get(f.advogadoChave) ?? f.advogadoChave) : null,
          situacao: f.situacao,
          criadaEm: dataDoDb(f.createdAt),
        }))}
        podeCriarFicha={editaClientes(eu.perfil)}
        podeEnviarDocs={editaClientes(eu.perfil) || advogado}
        apagaSoOsMeus={advogado ? eu.id : undefined}
        mostrarCausas={!advogado}
        mensagens={mensagens}
      />
    </div>
  );
}
