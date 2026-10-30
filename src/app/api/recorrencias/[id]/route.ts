import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recorrenciaPatchSchema } from "@/lib/validations";

/** { valor } muda o valor dos próximos meses; { ativa: false } para de repetir. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = recorrenciaPatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    const data: Prisma.DespesaRecorrenteUpdateManyMutationInput = {};
    if (parsed.data.valor !== undefined) data.valor = new Prisma.Decimal(parsed.data.valor);
    if (parsed.data.ativa === false) data.ativa = false;

    const { count } = await prisma.despesaRecorrente.updateMany({ where: { id }, data });
    if (count === 0) return NextResponse.json({ error: "Despesa recorrente não encontrada." }, { status: 404 });

    const r = await prisma.despesaRecorrente.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ id: r.id, valor: r.valor.toFixed(2), ativa: r.ativa });
  } catch (error) {
    console.error("[PATCH /api/recorrencias/[id]]", error);
    return NextResponse.json({ error: "Erro interno ao alterar a despesa recorrente." }, { status: 500 });
  }
}
