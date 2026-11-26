import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { podeEditarFicha } from "@/lib/ficha";
import { ErroTranscricao, transcreverAudio } from "@/lib/transcricao";

/** Transcreve um áudio da conversa do cliente. Não grava nada. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const f = await prisma.ficha.findFirst({ where: { id, cliente: filtroClientesDoUsuario(quem) }, select: { advogadoChave: true } });
    if (!f) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
    if (!podeEditarFicha(quem, f)) return NextResponse.json({ error: "Você não pode editar esta ficha." }, { status: 403 });
    const form = await request.formData().catch(() => null);
    const audio = form?.get("audio");
    if (!(audio instanceof File)) return NextResponse.json({ error: "Envie o áudio." }, { status: 400 });
    const texto = await transcreverAudio(audio.name, await audio.arrayBuffer());
    return NextResponse.json({ texto });
  } catch (err) {
    if (err instanceof ErroTranscricao) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[audio]", err);
    return NextResponse.json({ error: "Não foi possível transcrever." }, { status: 500 });
  }
}
