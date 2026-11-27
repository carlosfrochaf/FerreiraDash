// Busca no banco o que pode pertencer a cada causa. Só no servidor.
import { prisma } from "./prisma";
import { dataDoDb } from "./datas";
import { resultadoDasCausas, type CausaBase, type ItemCausa, type ResultadoCausa } from "./resultado-causa";

export async function resultadosDasCausas(causas: CausaBase[]): Promise<Record<string, ResultadoCausa>> {
  if (causas.length === 0) return {};
  const [audiencias, peticoes, lancamentos] = await Promise.all([
    prisma.audiencia.findMany({
      where: { valor: { not: null } },
      select: { data: true, advogadoNome: true, valor: true, statusPagamento: true, processoNumero: true, clienteId: true, clienteNome: true },
    }),
    prisma.peticao.findMany({
      where: { valor: { not: null } },
      select: { descricao: true, dataEntrega: true, advogadoNome: true, valor: true, status: true, processoNumero: true, clienteId: true, clienteNome: true },
    }),
    // Despesa recorrente (salário, custo fixo) nunca é da causa.
    prisma.transacao.findMany({
      where: { recorrenciaId: null, OR: [{ processoNumero: { not: null } }, { clienteNome: { not: null } }] },
      select: { tipo: true, valor: true, status: true, descricao: true, dataCompetencia: true, processoNumero: true, clienteNome: true, categoria: { select: { nome: true } } },
    }),
  ]);

  const itens: ItemCausa[] = [
    ...audiencias.map((a) => ({
      origem: "AUDIENCIA" as const,
      descricao: `Audiência · ${a.advogadoNome}`,
      data: dataDoDb(a.data),
      valor: a.valor!.toFixed(2),
      tipo: "SAIDA" as const,
      pago: a.statusPagamento === "PAGO",
      processoNumero: a.processoNumero,
      clienteId: a.clienteId,
      clienteNome: a.clienteNome,
    })),
    ...peticoes.map((p) => ({
      origem: "PETICAO" as const,
      descricao: `${p.descricao} · ${p.advogadoNome}`,
      data: dataDoDb(p.dataEntrega),
      valor: p.valor!.toFixed(2),
      tipo: "SAIDA" as const,
      pago: p.status === "PAGA",
      processoNumero: p.processoNumero,
      clienteId: p.clienteId,
      clienteNome: p.clienteNome,
    })),
    ...lancamentos.map((t) => ({
      origem: "LANCAMENTO" as const,
      descricao: t.descricao?.trim() || t.categoria.nome,
      data: dataDoDb(t.dataCompetencia),
      valor: t.valor.toFixed(2),
      tipo: t.tipo,
      pago: t.status === "PAGO",
      processoNumero: t.processoNumero,
      clienteId: null,
      clienteNome: t.clienteNome,
    })),
  ];
  return resultadoDasCausas(causas, itens);
}
