import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { lerOab } from "@/lib/intimacoes";
import { hojeSaoPaulo } from "@/lib/datas";
import { sincronizarIntimacoes } from "@/lib/intimacoes-servico";

/** Cadastra uma OAB e já traz as intimações da última semana (sem aviso no celular, para não disparar tudo de uma vez). */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const corpo = z.object({ oab: z.string().max(40) }).safeParse(await request.json().catch(() => null));
  const oab = corpo.success ? lerOab(corpo.data.oab) : null;
  if (!oab) return NextResponse.json({ error: "Digite a OAB com número e estado, ex.: 148002/MG." }, { status: 400 });
  await prisma.oabAcompanhada.upsert({ where: { numero_uf: oab }, create: oab, update: {} });
  const r = await sincronizarIntimacoes(hojeSaoPaulo()).catch((e) => {
    console.error("[intimacoes] primeira busca", e);
    return null;
  });
  const falhou = !r || r.falhas.length > 0;
  return NextResponse.json({ ok: true, novas: r?.novas.length ?? 0, falhou });
}

export async function DELETE(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "OAB não informada." }, { status: 400 });
  await prisma.oabAcompanhada.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
