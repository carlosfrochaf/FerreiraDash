import { NextResponse } from "next/server";
import { TipoDocumento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lerTicket } from "@/lib/documentos-envio";
import { apagarArquivo, tamanhoGuardado } from "@/lib/storage";
import { segredoSessao } from "@/lib/sessao";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { TAMANHO_MAXIMO } from "@/lib/documentos";

/** 2ª etapa do envio: o arquivo já está no Storage; registra o documento com os dados conferidos na 1ª. */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const segredo = segredoSessao();
  if (!segredo) return NextResponse.json({ error: "Documentos ainda não configurados." }, { status: 503 });
  const corpo = (await request.json().catch(() => null)) as { ticket?: unknown } | null;
  const d = lerTicket(corpo?.ticket, quem.id, segredo);
  if (!d) return NextResponse.json({ error: "Envio vencido ou inválido. Envie o arquivo de novo." }, { status: 400 });
  try {
    const tamanho = await tamanhoGuardado(d.caminho);
    if (tamanho === null) return NextResponse.json({ error: `${d.nome}: o arquivo não chegou. Envie de novo.` }, { status: 400 });
    if (tamanho > TAMANHO_MAXIMO) {
      await apagarArquivo(d.caminho).catch(() => {});
      return NextResponse.json({ error: `${d.nome}: arquivo maior que 10 MB.` }, { status: 400 });
    }
    const doc = await prisma.documento.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        clienteId: d.clienteId,
        recebimentoId: d.recebimentoId,
        peticaoId: d.peticaoId,
        enviadoPorId: quem.id,
        tipo: d.tipo as TipoDocumento,
        nome: d.nome,
        caminho: d.caminho,
        mime: d.mime,
        tamanho,
      },
    });
    return NextResponse.json({ id: doc.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documentos/confirmar]", error);
    return NextResponse.json({ error: "Não foi possível registrar o documento." }, { status: 500 });
  }
}
