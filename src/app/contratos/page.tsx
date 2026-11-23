import { prisma } from "@/lib/prisma";
import { AdvogadosTabs } from "@/components/layout/advogados-tabs";
import { configZapsign, ID_ZAPSIGN } from "@/lib/zapsign-servico";
import type { ArquivoAssinado } from "@/lib/zapsign";
import { ContratosLista, type ContratoTela } from "./contratos-lista";
import { ConectarZapsign } from "./conectar-zapsign";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const [lista, integracao] = await Promise.all([
    prisma.contratoAssinado.findMany({ orderBy: { assinadoEm: "desc" }, take: 300 }),
    prisma.integracao.findUnique({ where: { id: ID_ZAPSIGN } }),
  ]);
  // Mostra como "novo" só desta vez.
  const novos = lista.filter((c) => !c.vistoEm).map((c) => c.id);
  if (novos.length) await prisma.contratoAssinado.updateMany({ where: { id: { in: novos } }, data: { vistoEm: new Date() } });

  const contratos: ContratoTela[] = lista.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    cliente: c.clienteNome,
    cpf: c.clienteCpf,
    telefone: c.clienteTelefone,
    email: c.clienteEmail,
    assinadoEm: c.assinadoEm.toISOString(),
    novo: novos.includes(c.id),
    arquivos: (c.arquivos as ArquivoAssinado[]) ?? [],
  }));

  return (
    <div className="space-y-5">
      <AdvogadosTabs />
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Contratos assinados</h1>
        <p className="text-sm text-muted-foreground">
          Quando o cliente termina de assinar no ZapSign, o contrato aparece aqui, o cliente entra em Contatos e chega um aviso no celular.
        </p>
      </section>
      <ConectarZapsign configurado={!!configZapsign()} conectadoEm={integracao?.conectadoEm.toISOString() ?? null} />
      <ContratosLista contratos={contratos} />
    </div>
  );
}
