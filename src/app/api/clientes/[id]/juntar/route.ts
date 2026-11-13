import { NextResponse } from "next/server";
import { juntarClientesSchema } from "@/lib/validations";
import { juntarClientes } from "@/lib/clientes-servico";
import { ErroRecebimento } from "@/lib/recebimentos";
import { exigirPerfilApi } from "@/lib/usuario-atual";

/** Junta o cliente `origemId` (duplicado) neste cliente: tudo passa para cá e o duplicado some. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const parsed = juntarClientesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    await juntarClientes(id, parsed.data.origemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ErroRecebimento) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/clientes/[id]/juntar]", error);
    return NextResponse.json({ error: "Erro interno ao juntar os clientes." }, { status: 500 });
  }
}
