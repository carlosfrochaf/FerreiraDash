import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroIntimacoesDoUsuario } from "@/lib/intimacoes-acesso";

const schema = z.object({ lida: z.boolean() });

/** Marca (ou desmarca) como lida. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const corpo = schema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  const { count } = await prisma.intimacao.updateMany({
    where: { id, ...filtroIntimacoesDoUsuario(quem) },
    data: corpo.data.lida ? { lidaEm: new Date(), lidaPorId: quem.id } : { lidaEm: null, lidaPorId: null },
  });
  if (count === 0) return NextResponse.json({ error: "Intimação não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
