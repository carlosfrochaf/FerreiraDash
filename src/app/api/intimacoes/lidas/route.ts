import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

/** "Marcar todas como lidas": só as que estavam na tela (uma que chegou depois continua não lida). */
export async function POST(request: Request) {
  const corpo = schema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { count } = await prisma.intimacao.updateMany({ where: { id: { in: corpo.data.ids }, lidaEm: null }, data: { lidaEm: new Date() } });
  return NextResponse.json({ marcadas: count });
}
