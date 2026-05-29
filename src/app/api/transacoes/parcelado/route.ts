import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      tipo,
      categoriaId,
      valor, // valor de cada parcela
      dataCompetencia, // data do 1º vencimento (string YYYY-MM-DD)
      status,
      descricao,
      processoId,
      contatoId,
      processoNumero,
      clienteNome,
      reclamada,
      numeroParcelas,
    } = body;

    // Validações básicas
    if (!categoriaId) {
      return NextResponse.json({ error: "Categoria é obrigatória." }, { status: 400 });
    }
    if (!valor || valor <= 0) {
      return NextResponse.json({ error: "Valor da parcela deve ser maior que zero." }, { status: 400 });
    }
    if (!dataCompetencia) {
      return NextResponse.json({ error: "Data do primeiro vencimento é obrigatória." }, { status: 400 });
    }
    if (!numeroParcelas || numeroParcelas <= 0 || numeroParcelas > 120) {
      return NextResponse.json({ error: "Número de parcelas inválido (máx 120)." }, { status: 400 });
    }

    const dataBase = new Date(dataCompetencia);
    const descGeral = descricao || "Acordo parcelado";

    // Criar as N transações dentro de uma transação do Prisma
    const transacoes = await prisma.$transaction(async (tx) => {
      const criadas = [];
      for (let i = 0; i < numeroParcelas; i++) {
        const dataParcela = addMonths(dataBase, i);
        
        const descParcela = `${descGeral} (Parcela ${i + 1}/${numeroParcelas})`;

        const t = await tx.transacao.create({
          data: {
            tipo: tipo || "ENTRADA",
            categoriaId,
            valor: new Prisma.Decimal(valor),
            dataCompetencia: dataParcela,
            status: status || "PENDENTE",
            descricao: descParcela,
            processoId: processoId || null,
            contatoId: contatoId || null,
            processoNumero: processoNumero || null,
            clienteNome: clienteNome || null,
            reclamada: reclamada || null,
          },
        });
        criadas.push(t);
      }
      return criadas;
    });

    return NextResponse.json({ success: true, count: transacoes.length }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/transacoes/parcelado]", error);
    return NextResponse.json({ error: "Erro interno ao gerar parcelamento de acordo." }, { status: 500 });
  }
}
