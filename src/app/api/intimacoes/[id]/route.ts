import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.union([z.object({ lida: z.boolean() }), z.object({ clienteNome: z.string().trim().min(1).max(200) })]);

/** Marca (ou desmarca) como lida, ou troca o nome do cliente (vale para todas as intimações do mesmo processo). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const corpo = schema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  if ("clienteNome" in corpo.data) {
    const i = await prisma.intimacao.findUnique({ where: { id }, select: { numeroProcesso: true } });
    if (!i) return NextResponse.json({ error: "Intimação não encontrada." }, { status: 404 });
    await prisma.intimacao.updateMany({ where: { numeroProcesso: i.numeroProcesso }, data: { clienteNome: corpo.data.clienteNome } });
    return NextResponse.json({ ok: true });
  }
  const { count } = await prisma.intimacao.updateMany({ where: { id }, data: { lidaEm: corpo.data.lida ? new Date() : null } });
  if (count === 0) return NextResponse.json({ error: "Intimação não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
