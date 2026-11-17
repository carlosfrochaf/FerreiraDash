import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ lida: z.boolean() });

/** Marca (ou desmarca) como lida. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const corpo = schema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  const { count } = await prisma.intimacao.updateMany({ where: { id }, data: { lidaEm: corpo.data.lida ? new Date() : null } });
  if (count === 0) return NextResponse.json({ error: "Intimação não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
