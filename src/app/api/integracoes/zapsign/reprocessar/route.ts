import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reprocessarContrato } from "@/lib/zapsign-servico";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Leva os contratos já gravados para o cadastro de clientes (PDFs e ficha). Seguro para repetir. */
export async function POST() {
  const contratos = await prisma.contratoAssinado.findMany({ select: { docToken: true, clienteNome: true }, orderBy: { assinadoEm: "asc" } });
  const resultado = [];
  for (const c of contratos) {
    try {
      resultado.push({ cliente: c.clienteNome, ...(await reprocessarContrato(c.docToken)) });
    } catch (e) {
      console.error("[zapsign reprocessar]", c.docToken, e);
      resultado.push({ cliente: c.clienteNome, erro: "falhou" });
    }
  }
  return NextResponse.json({ resultado });
}
