import { NextResponse } from "next/server";
import { parcelaAcaoSchema } from "@/lib/validations";
import { aplicarAcaoParcela, ErroRecebimento } from "@/lib/recebimentos";

export const dynamic = "force-dynamic";

/**
 * Ações na parcela (JSON):
 *   { acao: "receber", data? }      { acao: "desfazer_recebimento" }
 *   { acao: "repassar", data? }     { acao: "desfazer_repasse" }
 *   { acao: "alterar_vencimento", vencimento }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = parcelaAcaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return NextResponse.json(await aplicarAcaoParcela(id, parsed.data));
  } catch (error) {
    if (error instanceof ErroRecebimento) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[PATCH /api/parcelas/:id]", error);
    return NextResponse.json({ error: "Erro interno ao atualizar parcela." }, { status: 500 });
  }
}
