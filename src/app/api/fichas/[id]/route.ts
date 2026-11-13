import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { podeEditarFicha, podeEnviarFicha } from "@/lib/ficha";
import { avisarAdvogado, dadosDoClientePelaFicha, fichaPatchSchema, serializarFicha } from "@/lib/fichas-servico";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const parsed = fichaPatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    const atual = await prisma.ficha.findUnique({ where: { id }, include: { cliente: { select: { nome: true } } } });
    if (!atual) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
    if (!podeEditarFicha(quem, atual)) return NextResponse.json({ error: "Sem permissão para editar esta ficha." }, { status: 403 });

    const b = parsed.data;
    // O advogado não passa a ficha para outro advogado nem liga a causas (não vê causas).
    const ehAdvogado = quem.perfil === "ADVOGADO";
    const advogadoChave = ehAdvogado || b.advogadoChave === undefined ? atual.advogadoChave : b.advogadoChave || null;
    const empresa = b.empresa === undefined ? atual.empresa : b.empresa || null;
    let recebimentoId = atual.recebimentoId;
    if (!ehAdvogado && b.recebimentoId !== undefined) {
      if (b.recebimentoId) {
        const causa = await prisma.recebimento.findFirst({ where: { id: b.recebimentoId, clienteId: atual.clienteId }, select: { id: true } });
        if (!causa) return NextResponse.json({ error: "Causa não é deste cliente." }, { status: 400 });
      }
      recebimentoId = b.recebimentoId || null;
    }

    const enviar = b.acao === "enviar";
    if (enviar) {
      const motivo = podeEnviarFicha({ empresa, advogadoChave });
      if (motivo) return NextResponse.json({ error: motivo }, { status: 400 });
    }

    const [salva] = await prisma.$transaction([
      prisma.ficha.update({
        where: { id },
        data: {
          advogadoChave,
          empresa,
          recebimentoId,
          ...(b.dados && { dados: b.dados as Prisma.InputJsonValue }),
          ...(!b.dados && b.provasPedidas && { dados: { ...(atual.dados as object), provasPedidas: b.provasPedidas } as Prisma.InputJsonValue }),
          ...(enviar && { situacao: "ENVIADA", enviadaEm: new Date() }),
        },
      }),
      ...(b.cliente ? [prisma.cliente.update({ where: { id: atual.clienteId }, data: dadosDoClientePelaFicha(b.cliente) })] : []),
    ]);

    if (enviar && advogadoChave) {
      const nome = b.cliente?.nome ?? atual.cliente.nome;
      await avisarAdvogado(advogadoChave, {
        title: "Nova ficha para você",
        body: `${nome} × ${empresa}`,
        url: `/clientes/${atual.clienteId}/fichas/${id}`,
        tag: "ficha",
      }).catch((err) => console.error("[ficha] aviso ao advogado", err));
    }
    return NextResponse.json(serializarFicha(salva));
  } catch (error) {
    console.error("[PATCH /api/fichas/[id]]", error);
    return NextResponse.json({ error: "Erro interno ao salvar a ficha." }, { status: 500 });
  }
}
