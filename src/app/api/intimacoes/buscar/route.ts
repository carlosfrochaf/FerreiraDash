import { NextResponse } from "next/server";
import { hojeSaoPaulo } from "@/lib/datas";
import { sincronizarIntimacoes } from "@/lib/intimacoes-servico";

/** "Buscar agora": mesma busca da manhã, sem aviso no celular. */
export async function POST() {
  try {
    const r = await sincronizarIntimacoes(hojeSaoPaulo());
    if (r.falhou) return NextResponse.json({ error: "O Diário da Justiça não respondeu agora. Tente de novo mais tarde." }, { status: 502 });
    return NextResponse.json({ novas: r.novas.length });
  } catch (e) {
    console.error("[intimacoes] buscar", e);
    return NextResponse.json({ error: "Não foi possível buscar as intimações." }, { status: 500 });
  }
}
