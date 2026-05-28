import { NextResponse } from "next/server";
import { criarRepasseComTransacoes } from "@/lib/finance";
import { repasseSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = repasseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { processoId, valorTotalRecebido, percentualEscritorio, dataRecebimento, observacoes } =
      parsed.data;

    const resultado = await criarRepasseComTransacoes({
      processoId,
      valorTotalRecebido,
      percentualEscritorio,
      dataRecebimento: new Date(dataRecebimento),
      observacoes,
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("[POST /api/repasses]", error);
    return NextResponse.json({ error: "Erro interno ao registrar repasse." }, { status: 500 });
  }
}
