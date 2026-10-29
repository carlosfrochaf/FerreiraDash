import { NextResponse } from "next/server";
import { peticaoSchema } from "@/lib/validations";
import { criarPeticao, ErroNegocio, listarPeticoes } from "@/lib/peticoes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarPeticoes());
  } catch (error) {
    console.error("[GET /api/peticoes]", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = peticaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(await criarPeticao(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof ErroNegocio) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/peticoes]", error);
    return NextResponse.json({ error: "Erro interno ao salvar petição." }, { status: 500 });
  }
}
