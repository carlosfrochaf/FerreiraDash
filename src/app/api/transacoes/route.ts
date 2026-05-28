import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/upload";
import { transacaoSchema } from "@/lib/validations";

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
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let anexoUrl: string | undefined;
    let anexoNome: string | undefined;

    const anexo = formData.get("anexo");
    if (anexo instanceof File && anexo.size > 0) {
      const saved = await saveUpload(anexo);
      anexoUrl = saved.url;
      anexoNome = saved.nome;
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
        anexoUrl,
        anexoNome,
      },
    });

    return NextResponse.json(transacao, { status: 201 });
  } catch (error) {
    console.error("[POST /api/transacoes]", error);
    return NextResponse.json({ error: "Erro interno ao salvar transação." }, { status: 500 });
  }
}
