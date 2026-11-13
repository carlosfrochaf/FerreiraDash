import { NextResponse } from "next/server";
import { peticaoSchema } from "@/lib/validations";
import { criarPeticao, ErroNegocio, listarPeticoes } from "@/lib/peticoes";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { veValores } from "@/lib/perfis";
import { semValores } from "@/lib/acesso-dados";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    return NextResponse.json(await listarPeticoes(quem));
  } catch (error) {
    console.error("[GET /api/peticoes]", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const parsed = peticaoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(semValores(await criarPeticao(parsed.data, { semValores: !veValores(quem.perfil) }), quem.perfil), { status: 201 });
  } catch (error) {
    if (error instanceof ErroNegocio) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/peticoes]", error);
    return NextResponse.json({ error: "Erro interno ao salvar petição." }, { status: 500 });
  }
}
