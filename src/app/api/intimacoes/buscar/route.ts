import { NextResponse } from "next/server";
import { exigirPerfilApi } from "@/lib/usuario-atual";
import { hojeSaoPaulo } from "@/lib/datas";
import { avisarIntimacoesNovas, sincronizarIntimacoes } from "@/lib/intimacoes-servico";

/** "Buscar agora": mesma busca da manhã. */
export async function POST(request: Request) {
  const quem = await exigirPerfilApi(request);
  if (quem instanceof NextResponse) return quem;
  try {
    const r = await sincronizarIntimacoes(hojeSaoPaulo());
    if (r.oabs === 0) return NextResponse.json({ error: "Nenhuma OAB cadastrada. O dono cadastra em Ajustes → Integrações." }, { status: 400 });
    if (r.falhas.length === r.oabs) return NextResponse.json({ error: "O Diário da Justiça não respondeu agora. Tente de novo mais tarde." }, { status: 502 });
    await avisarIntimacoesNovas(r.novas).catch((e) => console.error("[intimacoes] aviso", e));
    return NextResponse.json({ novas: r.novas.length, falhas: r.falhas });
  } catch (e) {
    console.error("[intimacoes] buscar", e);
    return NextResponse.json({ error: "Não foi possível buscar as intimações." }, { status: 500 });
  }
}
