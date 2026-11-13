import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { modeloSchema } from "@/lib/mensagens-servico";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  const parsed = modeloSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const r = await prisma.modeloMensagem.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  await prisma.modeloMensagem.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
