import { NextResponse } from "next/server";
import { ErroRecebimento, excluirRecebimento, obterRecebimento } from "@/lib/recebimentos";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function erro(error: unknown, rota: string) {
  if (error instanceof ErroRecebimento) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(rota, error);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await obterRecebimento(id));
  } catch (error) {
    return erro(error, "[GET /api/recebimentos/:id]");
  }
}

/** Exclui o recebimento e todas as suas parcelas (para corrigir um lançamento errado). */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await excluirRecebimento(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return erro(error, "[DELETE /api/recebimentos/:id]");
  }
}
