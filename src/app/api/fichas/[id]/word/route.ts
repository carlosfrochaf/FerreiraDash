import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { filtroClientesDoUsuario } from "@/lib/acesso-clientes";
import { advogadosConhecidos } from "@/lib/usuarios";
import { serializarCliente } from "@/lib/clientes-servico";
import { serializarFicha } from "@/lib/fichas-servico";
import { gerarWord, secoesDaFicha } from "@/lib/ficha-word";
import { APP_NAME } from "@/lib/constants";

/** Baixa a ficha em Word (.docx). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const { id } = await params;
    const f = await prisma.ficha.findFirst({
      where: { id, cliente: filtroClientesDoUsuario(quem) },
      include: { cliente: { include: { documentos: { select: { tipo: true } } } } },
    });
    if (!f) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
    const ficha = serializarFicha(f);
    const cliente = serializarCliente(f.cliente);
    const advogadoNome = f.advogadoChave ? ((await advogadosConhecidos()).find((a) => a.chave === f.advogadoChave)?.nome ?? f.advogadoChave) : null;
    const secoes = secoesDaFicha({
      dados: ficha.dados,
      empresa: ficha.empresa,
      advogadoNome,
      cliente,
      tiposEnviados: f.cliente.documentos.map((d) => d.tipo),
    });
    const arquivo = await gerarWord(secoes, { escritorio: APP_NAME, cliente: cliente.nome, empresa: ficha.empresa });
    const nome = `Ficha - ${cliente.nome}${ficha.empresa ? ` x ${ficha.empresa}` : ""}.docx`;
    const ascii = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .\-]+/g, "_");
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/fichas/[id]/word]", error);
    return NextResponse.json({ error: "Não foi possível gerar o Word." }, { status: 500 });
  }
}
