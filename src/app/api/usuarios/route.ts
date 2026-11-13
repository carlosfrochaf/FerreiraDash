import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { serializarUsuario } from "@/lib/usuarios";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { usuarioNovoSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const lista = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(lista.map(serializarUsuario));
}

export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const corpo = usuarioNovoSchema.safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return NextResponse.json({ error: corpo.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { senha, advogadoChave, ...dados } = corpo.data;
  if (dados.perfil === "ADVOGADO" && !advogadoChave) {
    return NextResponse.json({ error: "Escolha qual advogado é esta pessoa." }, { status: 400 });
  }
  try {
    const u = await prisma.usuario.create({
      data: { ...dados, senhaHash: await hashSenha(senha), advogadoChave: dados.perfil === "ADVOGADO" ? advogadoChave : null },
    });
    return NextResponse.json(serializarUsuario(u), { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    throw e;
  }
}
