import { NextResponse } from "next/server";
import { TipoDocumento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { arquivoAceito, TODOS_OS_TIPOS, type TipoDoc } from "@/lib/documentos";
import { apagarArquivo, enviarArquivo, storageConfigurado } from "@/lib/storage";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { filtroDoUsuario } from "@/lib/acesso-dados";

/** Envia um arquivo (multipart: arquivo, clienteId, tipo, recebimentoId opcional). */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  if (!storageConfigurado()) return NextResponse.json({ error: "Documentos ainda não configurados." }, { status: 503 });
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const clienteId = String(form.get("clienteId") ?? "");
    const peticaoId = String(form.get("peticaoId") ?? "") || null;
    // Arquivo de petição é sempre do tipo "Petição".
    const tipo = (peticaoId ? "PETICAO" : String(form.get("tipo") ?? "OUTRO")) as TipoDoc;
    // O advogado não vê causas: o documento dele fica sem causa.
    const recebimentoId = quem.perfil === "ADVOGADO" ? null : String(form.get("recebimentoId") ?? "") || null;
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Escolha um arquivo." }, { status: 400 });
    if (!TODOS_OS_TIPOS.includes(tipo)) return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    const erro = arquivoAceito(arquivo.type, arquivo.size);
    if (erro) return NextResponse.json({ error: `${arquivo.name}: ${erro}` }, { status: 400 });

    const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, ...filtroClientesDoUsuario(quem) }, select: { id: true } });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (recebimentoId) {
      const causa = await prisma.recebimento.findFirst({ where: { id: recebimentoId, clienteId }, select: { id: true } });
      if (!causa) return NextResponse.json({ error: "Essa causa não é deste cliente." }, { status: 400 });
    }

    if (peticaoId) {
      // A petição tem de ser deste cliente e, para o advogado, dele.
      const pet = await prisma.peticao.findFirst({ where: { id: peticaoId, clienteId, ...filtroDoUsuario(quem) }, select: { id: true } });
      if (!pet) return NextResponse.json({ error: "Essa petição não é deste cliente." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const nomeSeguro = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
    const caminho = `clientes/${clienteId}/${id}-${nomeSeguro}`;
    await enviarArquivo(caminho, arquivo, arquivo.type);
    try {
      const doc = await prisma.documento.create({
        data: { id, clienteId, recebimentoId, peticaoId, enviadoPorId: quem.id, tipo: tipo as TipoDocumento, nome: arquivo.name, caminho, mime: arquivo.type, tamanho: arquivo.size },
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
