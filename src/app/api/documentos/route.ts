import { NextResponse } from "next/server";
import { z } from "zod";
import { TipoDocumento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { arquivoAceito, TODOS_OS_TIPOS, type TipoDoc } from "@/lib/documentos";
import { assinarTicket, nomeSeguro } from "@/lib/documentos-envio";
import { linkDeEnvio, storageConfigurado } from "@/lib/storage";
import { segredoSessao } from "@/lib/sessao";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { filtroDoUsuario } from "@/lib/acesso-dados";

const schema = z.object({
  clienteId: z.string().min(1),
  tipo: z.string().optional(),
  recebimentoId: z.string().optional().nullable(),
  peticaoId: z.string().optional().nullable(),
  nome: z.string().trim().min(1).max(200),
  mime: z.string(),
  tamanho: z.number().int(),
});

/**
 * 1ª etapa do envio: confere permissão, tipo e tamanho e devolve o link para o navegador mandar o arquivo
 * direto ao Storage, mais um ticket assinado para registrar depois (POST /api/documentos/confirmar).
 */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const segredo = segredoSessao();
  if (!storageConfigurado() || !segredo) return NextResponse.json({ error: "Documentos ainda não configurados." }, { status: 503 });
  const corpo = schema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { clienteId, nome, mime, tamanho } = corpo.data;
  const peticaoId = corpo.data.peticaoId || null;
  // Arquivo de petição é sempre do tipo "Petição".
  const tipo = (peticaoId ? "PETICAO" : corpo.data.tipo || "OUTRO") as TipoDoc;
  // O advogado não vê causas: o documento dele fica sem causa.
  const recebimentoId = quem.perfil === "ADVOGADO" ? null : corpo.data.recebimentoId || null;
  try {
    if (!TODOS_OS_TIPOS.includes(tipo)) return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    const erro = arquivoAceito(mime, tamanho);
    if (erro) return NextResponse.json({ error: `${nome}: ${erro}` }, { status: 400 });

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
    const caminho = `clientes/${clienteId}/${id}-${nomeSeguro(nome)}`;
    const uploadUrl = await linkDeEnvio(caminho);
    const ticket = assinarTicket({ id, usuarioId: quem.id, clienteId, recebimentoId, peticaoId, tipo: tipo as TipoDocumento, nome, caminho, mime, tamanho }, segredo);
    return NextResponse.json({ uploadUrl, ticket });
  } catch (error) {
    console.error("[POST /api/documentos]", error);
    return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 });
  }
}
