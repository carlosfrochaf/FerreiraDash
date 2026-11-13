// Avisos extras da manhã: ficha parada (todo dia) e resumo da semana (segunda). Só no servidor.
import { prisma } from "./prisma";
import { dataDoDb, dataParaDb } from "./datas";
import { avisarUsuarios, avisarAdvogado } from "./fichas-servico";
import { ehSegunda, fichasParadas, montarResumoSemanal } from "./resumo-semanal";

function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function avisarFichasParadas(hoje: string): Promise<number> {
  const enviadas = await prisma.ficha.findMany({
    where: { situacao: "ENVIADA", enviadaEm: { not: null } },
    select: { id: true, clienteId: true, empresa: true, advogadoChave: true, enviadaEm: true, cliente: { select: { nome: true } } },
  });
  if (enviadas.length === 0) return 0;
  const peticoes = await prisma.peticao.findMany({
    where: { clienteId: { in: [...new Set(enviadas.map((f) => f.clienteId))] } },
    select: { clienteId: true, createdAt: true },
  });
  const paradas = fichasParadas(
    enviadas.map((f) => ({ id: f.id, clienteId: f.clienteId, clienteNome: f.cliente.nome, empresa: f.empresa, advogadoChave: f.advogadoChave, enviadaEm: dataDoDb(f.enviadaEm!) })),
    peticoes.map((p) => ({ clienteId: p.clienteId!, criadaEm: dataDoDb(p.createdAt) })),
    hoje,
  );
  let n = 0;
  for (const f of paradas) {
    if (!f.advogadoChave) continue;
    n += await avisarAdvogado(f.advogadoChave, {
      title: `Ficha parada há ${f.dias} dias`,
      body: `${f.clienteNome}${f.empresa ? ` × ${f.empresa}` : ""}: ainda sem petição.`,
      url: `/clientes/${f.clienteId}/fichas/${f.id}`,
      tag: `ficha-parada-${f.id}`,
    });
  }
  if (paradas.length > 0) {
    const nomes = paradas.slice(0, 3).map((f) => f.clienteNome).join(", ");
    n += await avisarUsuarios(
      { perfil: "DONO" },
      {
        title: paradas.length === 1 ? "1 ficha parada com o advogado" : `${paradas.length} fichas paradas com advogados`,
        body: `Sem petição há 7 dias ou mais: ${nomes}${paradas.length > 3 ? "…" : ""}`,
        url: paradas.length === 1 ? `/clientes/${paradas[0].clienteId}/fichas/${paradas[0].id}` : "/clientes",
        tag: "fichas-paradas",
      },
    );
  }
  return n;
}

async function enviarResumoSemanal(hoje: string): Promise<number> {
  const inicio = somarDias(hoje, -7);
  const de = dataParaDb(inicio);
  const ate = dataParaDb(hoje);
  const [contratos, fichasSemAdvogado, peticoes, entradas, parcelas] = await Promise.all([
    prisma.documento.count({ where: { tipo: "CONTRATO_HONORARIOS", createdAt: { gte: de, lt: ate } } }),
    prisma.ficha.count({ where: { situacao: "RASCUNHO", advogadoChave: null } }),
    prisma.peticao.count({ where: { dataEntrega: { gte: de, lt: ate } } }),
    prisma.transacao.aggregate({ where: { tipo: "ENTRADA", status: "PAGO", dataCompetencia: { gte: de, lt: ate } }, _sum: { valor: true } }),
    prisma.parcela.aggregate({ where: { statusRecebimento: "RECEBIDO", dataRecebimento: { gte: de, lt: ate } }, _sum: { valorEscritorio: true } }),
  ]);
  const n = montarResumoSemanal({
    contratos,
    fichasSemAdvogado,
    peticoes,
    entrou: Number(entradas._sum.valor ?? 0) + Number(parcelas._sum.valorEscritorio ?? 0),
  });
  return n ? avisarUsuarios({ perfil: "DONO" }, n) : 0;
}

/** Roda no aviso da manhã. Falha num não impede o outro. */
export async function avisosDaManha(hoje: string): Promise<number> {
  let n = 0;
  try {
    n += await avisarFichasParadas(hoje);
  } catch (e) {
    console.error("[avisos] fichas paradas", e);
  }
  if (ehSegunda(hoje)) {
    try {
      n += await enviarResumoSemanal(hoje);
    } catch (e) {
      console.error("[avisos] resumo semanal", e);
    }
  }
  return n;
}
