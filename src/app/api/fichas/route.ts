import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { hojeSaoPaulo } from "@/lib/datas";
import { serializarFicha } from "@/lib/fichas-servico";

const novaSchema = z.object({ clienteId: z.string().min(1).max(100) });

/** Abre uma ficha em rascunho. Quem abre é o escritório (dono ou secretária). */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  if (quem.perfil !== "DONO" && quem.perfil !== "SECRETARIA") {
    return NextResponse.json({ error: "A ficha é aberta pelo escritório." }, { status: 403 });
  }
  try {
    const parsed = novaSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Cliente não informado." }, { status: 400 });
    const cliente = await prisma.cliente.findUnique({ where: { id: parsed.data.clienteId }, select: { id: true } });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const f = await prisma.ficha.create({
      data: { clienteId: cliente.id, criadaPorId: quem.id, dados: { dataAtendimento: hojeSaoPaulo() } },
    });
    return NextResponse.json(serializarFicha(f), { status: 201 });
  } catch (error) {
    console.error("[POST /api/fichas]", error);
    return NextResponse.json({ error: "Erro interno ao abrir a ficha." }, { status: 500 });
  }
}
