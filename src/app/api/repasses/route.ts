import { NextResponse } from "next/server";
import { criarRepasseComTransacoes } from "@/lib/finance";
import { repasseSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

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

    const {
      processoId,
      processoNumero,
      clienteNome,
      valorTotalRecebido,
      percentualEscritorio,
      dataRecebimento,
      observacoes,
    } = parsed.data;

    let finalProcessoId = processoId;

    // Se não tiver processoId, cria o processo e o cliente automaticamente
    if (!finalProcessoId) {
      if (!processoNumero || !clienteNome) {
        return NextResponse.json(
          { error: "Selecione um processo existente ou informe o número do processo e nome do cliente para cadastrá-lo." },
          { status: 400 }
        );
      }

      const novoProcesso = await prisma.$transaction(async (tx) => {
        // Tenta achar ou cria o contato do cliente
        let contato = await tx.contato.findFirst({
          where: { nome: clienteNome.trim(), tipo: "CLIENTE", ativo: true },
        });

        if (!contato) {
          contato = await tx.contato.create({
            data: {
              nome: clienteNome.trim(),
              tipo: "CLIENTE",
            },
          });
        }

        // Tenta achar ou cria o processo
        let proc = await tx.processo.findUnique({
          where: { numeroPje: processoNumero.trim() },
        });

        if (!proc) {
          proc = await tx.processo.create({
            data: {
              numeroPje: processoNumero.trim(),
              nomeAcao: "Ação de Repasse Jurídico",
              clienteId: contato.id,
            },
          });
        }

        return proc;
      });

      finalProcessoId = novoProcesso.id;
    }

    const resultado = await criarRepasseComTransacoes({
      processoId: finalProcessoId,
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
