import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { linkAssinado } from "@/lib/storage";
import { nomeNoZip } from "@/lib/pasta-cliente";
import type { TipoDoc } from "@/lib/documentos";

/**
 * O que vai na pasta do cliente: links temporários de cada documento e as fichas.
 * O .zip é montado no navegador (a Vercel não devolve respostas grandes).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findFirst({
      where: { id, ...filtroClientesDoUsuario(quem) },
      select: {
        nome: true,
        documentos: { orderBy: { createdAt: "asc" }, select: { tipo: true, nome: true, caminho: true } },
        fichas: { orderBy: { createdAt: "asc" }, select: { id: true, empresa: true } },
      },
    });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const usados = new Set<string>();
    const arquivos = await Promise.all(
      cliente.documentos.map(async (d) => ({
        caminhoNoZip: nomeNoZip({ tipo: d.tipo as TipoDoc, nome: d.nome, caminho: d.caminho }, usados),
        url: await linkAssinado(d.caminho, undefined, 600),
      }))
    );
    return NextResponse.json({ nome: cliente.nome, arquivos, fichas: cliente.fichas });
  } catch (error) {
    console.error("[GET /api/clientes/[id]/pasta]", error);
    return NextResponse.json({ error: "Não foi possível preparar a pasta." }, { status: 500 });
  }
}
