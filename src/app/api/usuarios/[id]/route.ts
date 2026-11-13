import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { mudancaPermitida, serializarUsuario } from "@/lib/usuarios";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { usuarioPatchSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const { id } = await params;
  const corpo = usuarioPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return NextResponse.json({ error: corpo.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const atual = await prisma.usuario.findUnique({ where: { id } });
  if (!atual) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { senha, ...m } = corpo.data;
  const perfil = m.perfil ?? atual.perfil;
  const todos = await prisma.usuario.findMany({ select: { id: true, perfil: true, ativo: true } });
  const erro = mudancaPermitida(todos, id, { perfil, ativo: m.ativo ?? atual.ativo });
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });
  const advogadoChave = perfil === "ADVOGADO" ? (m.advogadoChave !== undefined ? m.advogadoChave : atual.advogadoChave) : null;
  if (perfil === "ADVOGADO" && !advogadoChave) return NextResponse.json({ error: "Escolha qual advogado é esta pessoa." }, { status: 400 });

  // Trocar senha, perfil ou desativar derruba as sessões abertas dessa pessoa.
  const derruba = !!senha || perfil !== atual.perfil || m.ativo === false || advogadoChave !== atual.advogadoChave;
  const u = await prisma.usuario.update({
    where: { id },
    data: {
      ...(m.nome ? { nome: m.nome } : {}),
      perfil,
      advogadoChave,
      ...(m.ativo !== undefined ? { ativo: m.ativo } : {}),
      ...(senha ? { senhaHash: await hashSenha(senha) } : {}),
      ...(derruba ? { versaoSessao: { increment: 1 } } : {}),
    },
  });
  return NextResponse.json(serializarUsuario(u));
}
