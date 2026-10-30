import { Prisma, StatusTransacao, TipoTransacao } from "@prisma/client";
import { prisma } from "./prisma";
import { dataParaDb, hojeSaoPaulo } from "./datas";
import { mesDe, mesesQueFaltam } from "./recorrencias";

/** Categorias de saída que podem se repetir todo mês. */
export const SLUGS_RECORRENTES = ["CUSTO_OPERACIONAL", "SALARIO"];

/**
 * Lança os meses que faltam de cada despesa recorrente ativa, como pendentes.
 * Chamado no disparo das 8h e ao abrir a tela Despesas.
 * Retorna quantos lançamentos criou.
 */
export async function gerarDespesasRecorrentes(hoje: string = hojeSaoPaulo()): Promise<number> {
  const atrasadas = await prisma.despesaRecorrente.findMany({
    where: { ativa: true, ultimoMes: { lt: mesDe(hoje) } },
  });

  let criadas = 0;
  for (const r of atrasadas) {
    const vencimentos = mesesQueFaltam(r, hoje);
    if (vencimentos.length === 0) continue;

    criadas += await prisma.$transaction(async (tx) => {
      // Avança o "último mês" só se ninguém avançou antes: dois disparos ao
      // mesmo tempo não lançam o mesmo mês duas vezes.
      const { count } = await tx.despesaRecorrente.updateMany({
        where: { id: r.id, ativa: true, ultimoMes: r.ultimoMes },
        data: { ultimoMes: mesDe(vencimentos[vencimentos.length - 1]) },
      });
      if (count === 0) return 0;

      await tx.transacao.createMany({
        data: vencimentos.map((v) => ({
          tipo: TipoTransacao.SAIDA,
          status: StatusTransacao.PENDENTE,
          categoriaId: r.categoriaId,
          valor: r.valor,
          descricao: r.nome,
          dataCompetencia: dataParaDb(v),
          recorrenciaId: r.id,
        })),
      });
      return vencimentos.length;
    });
  }
  return criadas;
}

/** Cria a recorrência e o lançamento do primeiro mês, ligados. */
export async function criarDespesaRecorrente(dados: {
  nome: string;
  valor: number;
  categoriaId: string;
  vencimento: string; // AAAA-MM-DD
  status: StatusTransacao;
  dataPagamento?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const recorrencia = await tx.despesaRecorrente.create({
      data: {
        nome: dados.nome,
        valor: new Prisma.Decimal(dados.valor),
        categoriaId: dados.categoriaId,
        diaVencimento: Number(dados.vencimento.slice(8, 10)),
        ultimoMes: mesDe(dados.vencimento),
      },
    });
    return tx.transacao.create({
      data: {
        tipo: TipoTransacao.SAIDA,
        status: dados.status,
        categoriaId: dados.categoriaId,
        valor: new Prisma.Decimal(dados.valor),
        descricao: dados.nome,
        dataCompetencia: dataParaDb(dados.vencimento),
        dataPagamento: dados.dataPagamento ? dataParaDb(dados.dataPagamento) : null,
        recorrenciaId: recorrencia.id,
      },
    });
  });
}
