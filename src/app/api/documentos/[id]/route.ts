import { NextResponse } from "next/server";
import { TipoDocumento } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TODOS_OS_TIPOS } from "@/lib/documentos";
import { apagarArquivo, linkAssinado } from "@/lib/storage";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario, podeApagarDocumento } from "@/lib/acesso-clientes";

type Ctx = { params: Promise<{ id: string }> };

/** Abre o documento (?baixar=1 baixa): redireciona para um link que vale 5 minutos. */
export async function GET(request: Request, { params }: Ctx) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  // Documento de cliente que a pessoa não vê é tratado como inexistente.
  const doc = await prisma.documento.findFirst({ where: { id, cliente: filtroClientesDoUsuario(quem) } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  try {
    const baixar = new URL(request.url).searchParams.has("baixar");
    return NextResponse.redirect(await linkAssinado(doc.caminho, baixar ? doc.nome : undefined));
  } catch (error) {
    console.error("[GET /api/documentos/[id]]", error);
    return NextResponse.json({ error: "Não foi possível abrir o documento." }, { status: 502 });
  }
}

const patchSchema = z.object({
  nome: z.string().trim().min(1).max(200).optional(),
  tipo: z.enum(TODOS_OS_TIPOS as [string, ...string[]]).optional(),
  recebimentoId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Ctx) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  // Documento de cliente que a pessoa não vê é tratado como inexistente.
  const doc = await prisma.documento.findFirst({ where: { id, cliente: filtroClientesDoUsuario(quem) } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  if (!podeApagarDocumento(quem, doc)) return NextResponse.json({ error: "Só quem enviou pode mudar este documento." }, { status: 403 });
  const { nome, tipo } = parsed.data;
  const recebimentoId = quem.perfil === "ADVOGADO" ? undefined : parsed.data.recebimentoId;
  if (recebimentoId) {
    const causa = await prisma.recebimento.findFirst({ where: { id: recebimentoId, clienteId: doc.clienteId }, select: { id: true } });
    if (!causa) return NextResponse.json({ error: "Essa causa não é deste cliente." }, { status: 400 });
  }
  await prisma.documento.update({
    where: { id },
    data: { ...(nome ? { nome } : {}), ...(tipo ? { tipo: tipo as TipoDocumento } : {}), ...(recebimentoId !== undefined ? { recebimentoId } : {}) },
  });
  return NextResponse.json({ ok: true });
}

/** Apaga o arquivo e depois o registro; se o arquivo não sair, o registro fica. */
export async function DELETE(request: Request, { params }: Ctx) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  // Documento de cliente que a pessoa não vê é tratado como inexistente.
  const doc = await prisma.documento.findFirst({ where: { id, cliente: filtroClientesDoUsuario(quem) } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  if (!podeApagarDocumento(quem, doc)) return NextResponse.json({ error: "Só quem enviou pode apagar este documento." }, { status: 403 });
  try {
    await apagarArquivo(doc.caminho);
  } catch (error) {
    console.error("[DELETE /api/documentos/[id]]", error);
    return NextResponse.json({ error: "Não foi possível apagar o arquivo agora. Tente de novo." }, { status: 502 });
  }
  await prisma.documento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
