import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { podeEditarFicha } from "@/lib/ficha";
import { ErroConversa, extrairDaConversa, textoDoArquivo } from "@/lib/conversa-ficha-ia";

const TAMANHO_MAXIMO = 15 * 1024 * 1024;

/** Lê a conversa do WhatsApp e devolve os dados sugeridos. Não grava nada: a tela junta e a pessoa salva. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const f = await prisma.ficha.findFirst({ where: { id, cliente: filtroClientesDoUsuario(quem) }, select: { advogadoChave: true } });
    if (!f) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
    if (!podeEditarFicha(quem, f)) return NextResponse.json({ error: "Você não pode editar esta ficha." }, { status: 403 });

    const form = await request.formData().catch(() => null);
    const arquivo = form?.get("arquivo");
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Envie o arquivo da conversa." }, { status: 400 });
    if (arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ error: "Arquivo grande demais. No WhatsApp, exporte a conversa \"sem mídia\"." }, { status: 413 });
    }
    const texto = await textoDoArquivo(arquivo.name, await arquivo.arrayBuffer());
    const extracao = await extrairDaConversa(texto);
    return NextResponse.json({ extracao });
  } catch (err) {
    if (err instanceof ErroConversa) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[conversa]", err);
    return NextResponse.json({ error: "Não foi possível ler a conversa." }, { status: 500 });
  }
}
