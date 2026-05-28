import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categoriaSchema } from "@/lib/validations";

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: [
        { tipo: "asc" },
        { nome: "asc" }
      ]
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error("[GET /api/categorias]", error);
    return NextResponse.json({ error: "Erro ao buscar categorias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = categoriaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { nome, tipo, ativo } = parsed.data;

    const categoriaExistente = await prisma.categoria.findFirst({
      where: {
        nome: { equals: nome },
        tipo,
      },
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { error: { nome: ["Já existe uma categoria com este nome."] } },
        { status: 400 }
      );
    }

    const novaCategoria = await prisma.categoria.create({
      data: {
        nome,
        tipo,
        ativo: ativo ?? true,
      },
    });

    return NextResponse.json(novaCategoria, { status: 201 });
  } catch (error) {
    console.error("[POST /api/categorias]", error);
    return NextResponse.json({ error: "Erro interno ao salvar categoria." }, { status: 500 });
  }
}
