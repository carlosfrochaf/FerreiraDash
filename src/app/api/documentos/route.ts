import { NextResponse } from "next/server";
import { TipoDocumento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { arquivoAceito, TODOS_OS_TIPOS, type TipoDoc } from "@/lib/documentos";
import { apagarArquivo, enviarArquivo, storageConfigurado } from "@/lib/storage";

/** Envia um arquivo (multipart: arquivo, clienteId, tipo, recebimentoId opcional). */
export async function POST(request: Request) {
  if (!storageConfigurado()) return NextResponse.json({ error: "Documentos ainda não configurados." }, { status: 503 });
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const clienteId = String(form.get("clienteId") ?? "");
    const tipo = String(form.get("tipo") ?? "OUTRO") as TipoDoc;
    const recebimentoId = String(form.get("recebimentoId") ?? "") || null;
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Escolha um arquivo." }, { status: 400 });
    if (!TODOS_OS_TIPOS.includes(tipo)) return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    const erro = arquivoAceito(arquivo.type, arquivo.size);
    if (erro) return NextResponse.json({ error: `${arquivo.name}: ${erro}` }, { status: 400 });

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (recebimentoId) {
      const causa = await prisma.recebimento.findFirst({ where: { id: recebimentoId, clienteId }, select: { id: true } });
      if (!causa) return NextResponse.json({ error: "Essa causa não é deste cliente." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const nomeSeguro = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
    const caminho = `clientes/${clienteId}/${id}-${nomeSeguro}`;
    await enviarArquivo(caminho, arquivo, arquivo.type);
    try {
      const doc = await prisma.documento.create({
        data: { id, clienteId, recebimentoId, tipo: tipo as TipoDocumento, nome: arquivo.name, caminho, mime: arquivo.type, tamanho: arquivo.size },
      });
      return NextResponse.json({ id: doc.id }, { status: 201 });
    } catch (e) {
      await apagarArquivo(caminho).catch(() => {});
      throw e;
    }
  } catch (error) {
    console.error("[POST /api/documentos]", error);
    return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 });
  }
}
