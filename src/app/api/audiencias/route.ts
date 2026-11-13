import { NextResponse } from "next/server";
import { audienciaSchema } from "@/lib/validations";
import { criarAudiencia, ErroNegocio, listarAudiencias } from "@/lib/audiencias";
import { exigirPerfilApi } from "@/lib/usuario-atual";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    return NextResponse.json(await listarAudiencias());
  } catch (error) {
    console.error("[GET /api/audiencias]", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
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
