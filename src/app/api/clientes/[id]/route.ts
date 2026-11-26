import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";
import { dadosCliente, serializarCliente } from "@/lib/clientes-servico";
import { exigirPerfilApi } from "@/lib/usuario-atual";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const parsed = clienteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    const existe = await prisma.cliente.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const salvo = await prisma.cliente.update({ where: { id }, data: dadosCliente(parsed.data) });
    return NextResponse.json(serializarCliente(salvo));
  } catch (error) {
    console.error("[PATCH /api/clientes/[id]]", error);
    return NextResponse.json({ error: "Erro interno ao salvar o cliente." }, { status: 500 });
  }
}
