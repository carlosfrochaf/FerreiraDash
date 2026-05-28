import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categoriaSchema } from "@/lib/validations";

const updateSchema = categoriaSchema.partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const categoriaExistente = await prisma.categoria.findUnique({
      where: { id },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    // Protect system categories from being deactivated
    if (categoriaExistente.slug !== null && data.ativo === false) {
      return NextResponse.json(
        { error: "Categorias do sistema não podem ser desativadas." },
        { status: 400 }
      );
    }

    if (data.nome && data.nome !== categoriaExistente.nome) {
      const nomeDuplicado = await prisma.categoria.findFirst({
        where: {
          nome: { equals: data.nome },
          tipo: categoriaExistente.tipo,
          id: { not: id },
        },
      });

      if (nomeDuplicado) {
        return NextResponse.json(
          { error: { nome: ["Já existe uma categoria com este nome."] } },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    const categoriaAtualizada = await prisma.categoria.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(categoriaAtualizada);
  } catch (error) {
    console.error("[PATCH /api/categorias/[id]]", error);
    return NextResponse.json({ error: "Erro interno ao atualizar categoria." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const categoriaExistente = await prisma.categoria.findUnique({
      where: { id },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    if (categoriaExistente.slug !== null) {
      return NextResponse.json(
        { error: "Categorias essenciais do sistema não podem ser excluídas." },
        { status: 400 }
      );
    }

    const transacoesVinculadas = await prisma.transacao.count({
      where: { categoriaId: id },
    });

    if (transacoesVinculadas > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir esta categoria pois ela possui lançamentos vinculados." },
        { status: 400 }
      );
    }

    await prisma.categoria.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/categorias/[id]]", error);
    return NextResponse.json({ error: "Erro interno ao excluir categoria." }, { status: 500 });
  }
}
