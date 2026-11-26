import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { listarModelos, modeloSchema } from "@/lib/mensagens-servico";

export async function GET(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  return NextResponse.json(await listarModelos());
}

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const parsed = modeloSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const ordem = ((await prisma.modeloMensagem.aggregate({ _max: { ordem: true } }))._max.ordem ?? 0) + 1;
  const m = await prisma.modeloMensagem.create({ data: { ...parsed.data, ordem } });
  return NextResponse.json({ id: m.id }, { status: 201 });
}
