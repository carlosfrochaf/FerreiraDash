import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { cookieDeSessao, existeUsuario } from "@/lib/usuarios";
import { usuarioNovoSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/** Liberado só enquanto o escritório não tem nenhum usuário. */
export async function GET() {
  return NextResponse.json({ liberado: !(await existeUsuario()) });
}

export async function POST(request: Request) {
  if (await existeUsuario()) return NextResponse.json({ error: "O primeiro acesso já foi criado." }, { status: 403 });
  const corpo = usuarioNovoSchema.omit({ perfil: true, advogadoChave: true }).safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return NextResponse.json({ error: corpo.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const u = await prisma.usuario.create({
    data: { nome: corpo.data.nome, email: corpo.data.email, senhaHash: await hashSenha(corpo.data.senha), perfil: "DONO" },
  });
  const res = NextResponse.json({ success: true });
  await cookieDeSessao(res, u);
  return res;
}
