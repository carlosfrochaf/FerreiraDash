import { NextResponse } from "next/server";
import { recebimentoSchema } from "@/lib/validations";
import { criarRecebimento, ErroRecebimento, listarRecebimentos } from "@/lib/recebimentos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarRecebimentos());
  } catch (error) {
    console.error("[GET /api/recebimentos]", error);
    return NextResponse.json({ error: "Erro interno ao listar recebimentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = recebimentoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return NextResponse.json(await criarRecebimento(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof ErroRecebimento) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/recebimentos]", error);
    return NextResponse.json({ error: "Erro interno ao salvar recebimento." }, { status: 500 });
  }
}
