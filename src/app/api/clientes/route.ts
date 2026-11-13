import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";
import { dadosCliente, serializarCliente } from "@/lib/clientes-servico";
import { exigirPerfilApi } from "@/lib/usuario-atual";

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const parsed = clienteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    const criado = await prisma.cliente.create({ data: dadosCliente(parsed.data) });
    return NextResponse.json(serializarCliente(criado), { status: 201 });
  } catch (error) {
    console.error("[POST /api/clientes]", error);
    return NextResponse.json({ error: "Erro interno ao salvar o cliente." }, { status: 500 });
  }
}
