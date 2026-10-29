import { NextResponse } from "next/server";
import { audienciaSchema } from "@/lib/validations";
import { criarAudiencia, ErroNegocio, listarAudiencias } from "@/lib/audiencias";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarAudiencias());
  } catch (error) {
    console.error("[GET /api/audiencias]", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = audienciaSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(await criarAudiencia(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof ErroNegocio) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/audiencias]", error);
    return NextResponse.json({ error: "Erro interno ao salvar audiência." }, { status: 500 });
  }
}
