import { prisma } from "@/lib/prisma";
import { CategoriasContent } from "./categorias-content";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Adicione, renomeie ou ative/desative categorias para seus lançamentos
        </p>
      </section>
      <CategoriasContent initialCategorias={categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        tipo: c.tipo,
        ativo: c.ativo,
      }))} />
    </div>
  );
}
