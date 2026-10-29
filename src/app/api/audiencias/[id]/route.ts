import { NextResponse } from "next/server";
import { audienciaAcaoSchema, audienciaSchema } from "@/lib/validations";
import { aplicarAcaoAudiencia, atualizarAudiencia, ErroNegocio, excluirAudiencia } from "@/lib/audiencias";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function erro(error: unknown, rota: string) {
  if (error instanceof ErroNegocio) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(rota, error);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

/** Edita todos os dados da audiência. */
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = audienciaSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(await atualizarAudiencia(id, parsed.data));
  } catch (error) {
    return erro(error, "[PUT /api/audiencias/:id]");
  }
}

/** Ações: { acao: "pagar", data? } ou { acao: "desfazer_pagamento" }. */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = audienciaAcaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    return NextResponse.json(await aplicarAcaoAudiencia(id, parsed.data));
  } catch (error) {
    return erro(error, "[PATCH /api/audiencias/:id]");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await excluirAudiencia(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return erro(error, "[DELETE /api/audiencias/:id]");
  }
}
