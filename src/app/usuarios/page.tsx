import { prisma } from "@/lib/prisma";
import { advogadosConhecidos, serializarUsuario } from "@/lib/usuarios";
import { usuarioAtual } from "@/lib/usuario-atual";
import { UsuariosContent } from "./usuarios-content";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const eu = await usuarioAtual();
  const [lista, advogados] = await Promise.all([prisma.usuario.findMany({ orderBy: { nome: "asc" } }), advogadosConhecidos()]);
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Quem entra no app e o que cada pessoa pode ver.</p>
      </section>
      <UsuariosContent usuarios={lista.map(serializarUsuario)} advogados={advogados} euId={eu.id} />
    </div>
  );
}
