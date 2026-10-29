import { NextResponse } from "next/server";
import { peticaoAcaoSchema, peticaoSchema } from "@/lib/validations";
import { aplicarAcaoPeticao, atualizarPeticao, ErroNegocio, excluirPeticao } from "@/lib/peticoes";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function erro(error: unknown, rota: string) {
  if (error instanceof ErroNegocio) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(rota, error);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

/** Edita todos os dados da petição (inclusive a situação). */
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = peticaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(await atualizarPeticao(id, parsed.data));
  } catch (error) {
    return erro(error, "[PUT /api/peticoes/:id]");
  }
}

/** Ações: validar, desfazer_validacao, pagar (data?), desfazer_pagamento. */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = peticaoAcaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    return NextResponse.json(await aplicarAcaoPeticao(id, parsed.data));
  } catch (error) {
    return erro(error, "[PATCH /api/peticoes/:id]");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await excluirPeticao(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return erro(error, "[DELETE /api/peticoes/:id]");
  }
}
