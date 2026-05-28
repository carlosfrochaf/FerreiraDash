import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/upload";
import { transacaoSchema } from "@/lib/validations";

const updateSchema = transacaoSchema.partial();


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";

    const updatePayload: any = {};
    let anexoFile: File | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      Object.assign(updatePayload, body);
    } else {
      const formData = await request.formData();
      if (formData.has("tipo")) updatePayload.tipo = formData.get("tipo");
      if (formData.has("categoriaId")) updatePayload.categoriaId = formData.get("categoriaId");
      if (formData.has("valor")) updatePayload.valor = Number(formData.get("valor"));
      if (formData.has("dataCompetencia")) updatePayload.dataCompetencia = formData.get("dataCompetencia");
      if (formData.has("dataPagamento")) updatePayload.dataPagamento = formData.get("dataPagamento") || undefined;
      if (formData.has("status")) updatePayload.status = formData.get("status");
      if (formData.has("descricao")) updatePayload.descricao = formData.get("descricao") || undefined;
      if (formData.has("processoId")) updatePayload.processoId = formData.get("processoId") || undefined;
      if (formData.has("contatoId")) updatePayload.contatoId = formData.get("contatoId") || undefined;
      if (formData.has("processoNumero")) updatePayload.processoNumero = formData.get("processoNumero") || undefined;
      if (formData.has("clienteNome")) updatePayload.clienteNome = formData.get("clienteNome") || undefined;
      if (formData.has("reclamada")) updatePayload.reclamada = formData.get("reclamada") || undefined;

      const anexo = formData.get("anexo");
      if (anexo instanceof File && anexo.size > 0) {
        anexoFile = anexo;
      }
    }

    const parsed = updateSchema.safeParse(updatePayload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const transacaoExistente = await prisma.transacao.findUnique({
      where: { id },
    });

    if (!transacaoExistente) {
      return NextResponse.json(
        { error: "Lançamento não encontrado." },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.categoriaId !== undefined) updateData.categoriaId = data.categoriaId;
    if (data.valor !== undefined) updateData.valor = new Prisma.Decimal(data.valor);
    if (data.dataCompetencia !== undefined) updateData.dataCompetencia = new Date(data.dataCompetencia);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.descricao !== undefined) updateData.descricao = data.descricao || null;
    if (data.processoId !== undefined) updateData.processoId = data.processoId || null;
    if (data.contatoId !== undefined) updateData.contatoId = data.contatoId || null;
    if (data.processoNumero !== undefined) updateData.processoNumero = data.processoNumero || null;
    if (data.clienteNome !== undefined) updateData.clienteNome = data.clienteNome || null;
    if (data.reclamada !== undefined) updateData.reclamada = data.reclamada || null;

    if (data.status === "PAGO") {
      updateData.dataPagamento = data.dataPagamento ? new Date(data.dataPagamento) : new Date();
    } else if (data.status === "PENDENTE" || data.status === "NAO_PAGO") {
      updateData.dataPagamento = null;
    } else if (data.dataPagamento !== undefined) {
      updateData.dataPagamento = data.dataPagamento ? new Date(data.dataPagamento) : null;
    }

    if (anexoFile) {
      const saved = await saveUpload(anexoFile);
      updateData.anexoUrl = saved.url;
      updateData.anexoNome = saved.nome;
    }

    const transacaoAtualizada = await prisma.transacao.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(transacaoAtualizada);
  } catch (error) {
    console.error("[PATCH /api/transacoes/[id]]", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar transação." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transacao = await prisma.transacao.findUnique({ where: { id } });
    if (!transacao) {
      return NextResponse.json(
        { error: "Lançamento não encontrado." },
        { status: 404 }
      );
    }

    await prisma.transacao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/transacoes/[id]]", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir lançamento." },
      { status: 500 }
    );
  }
}
