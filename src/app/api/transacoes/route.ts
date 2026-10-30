import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transacaoSchema } from "@/lib/validations";
import { SLUGS_RECORRENTES, criarDespesaRecorrente } from "@/lib/despesas-recorrentes";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const parsed = transacaoSchema.safeParse({
      tipo: formData.get("tipo"),
      categoriaId: formData.get("categoriaId"),
      valor: Number(formData.get("valor")),
      dataCompetencia: formData.get("dataCompetencia"),
      dataPagamento: formData.get("dataPagamento") || undefined,
      status: formData.get("status"),
      descricao: formData.get("descricao") || undefined,
      processoId: formData.get("processoId") || undefined,
      contatoId: formData.get("contatoId") || undefined,
      processoNumero: formData.get("processoNumero") || undefined,
      clienteNome: formData.get("clienteNome") || undefined,
      reclamada: formData.get("reclamada") || undefined,
      recorrente: formData.get("recorrente") === "true",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.recorrente) {
      const nome = data.descricao?.trim();
      if (!nome) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
      const categoria = await prisma.categoria.findUnique({ where: { id: data.categoriaId }, select: { slug: true } });
      if (data.tipo !== "SAIDA" || !categoria?.slug || !SLUGS_RECORRENTES.includes(categoria.slug)) {
        return NextResponse.json({ error: "Só custos operacionais e salários podem se repetir." }, { status: 400 });
      }
      const transacao = await criarDespesaRecorrente({
        nome,
        valor: data.valor,
        categoriaId: data.categoriaId,
        vencimento: data.dataCompetencia,
        status: data.status,
        dataPagamento: data.dataPagamento,
      });
      return NextResponse.json(transacao, { status: 201 });
    }

    const transacao = await prisma.transacao.create({
      data: {
        tipo: data.tipo,
        categoriaId: data.categoriaId,
        valor: new Prisma.Decimal(data.valor),
        dataCompetencia: new Date(data.dataCompetencia),
        dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
        status: data.status,
        descricao: data.descricao || null,
        processoId: data.processoId || null,
        contatoId: data.contatoId || null,
        processoNumero: data.processoNumero || null,
        clienteNome: data.clienteNome || null,
        reclamada: data.reclamada || null,
      },
    });

    return NextResponse.json(transacao, { status: 201 });
  } catch (error) {
    console.error("[POST /api/transacoes]", error);
    return NextResponse.json({ error: "Erro interno ao salvar transação." }, { status: 500 });
  }
}
