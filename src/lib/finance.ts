import {
  Prisma,
  StatusPagamento,
  StatusPeticao,
  StatusRecebimento,
  StatusRepasse,
  StatusTransacao,
  TipoTransacao,
} from "@prisma/client";
import { prisma } from "./prisma";
import type { DashboardResumo, ParcelaResumo } from "@/types";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "./datas";
import { serializarAudiencia } from "./audiencias";
import { serializarPeticao } from "./peticoes";
import { pixDosAdvogados } from "./advogados";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const incluirTransacao = {
  categoria: true,
  processo: { include: { cliente: true } },
  contato: true,
} satisfies Prisma.TransacaoInclude;

const incluirParcela = {
  recebimento: {
    select: { id: true, clienteNome: true, clientePix: true, reclamada: true, processoNumero: true, numeroParcelas: true },
  },
} satisfies Prisma.ParcelaInclude;

type ParcelaComRecebimento = Prisma.ParcelaGetPayload<{ include: typeof incluirParcela }>;

export function serializarParcelaResumo(p: ParcelaComRecebimento): ParcelaResumo {
  return {
    id: p.id,
    numero: p.numero,
    totalParcelas: p.recebimento.numeroParcelas,
    vencimento: dataDoDb(p.vencimento),
    valorParcela: p.valorParcela.toFixed(2),
    valorEscritorio: p.valorEscritorio.toFixed(2),
    valorCliente: p.valorCliente.toFixed(2),
    statusRecebimento: p.statusRecebimento,
    dataRecebimento: p.dataRecebimento ? dataDoDb(p.dataRecebimento) : null,
    statusRepasse: p.statusRepasse,
    dataRepasse: p.dataRepasse ? dataDoDb(p.dataRepasse) : null,
    recebimento: {
      id: p.recebimento.id,
      clienteNome: p.recebimento.clienteNome,
      clientePix: p.recebimento.clientePix,
      reclamada: p.recebimento.reclamada,
      processoNumero: p.recebimento.processoNumero,
    },
  };
}

function somaPorTipo(grupos: { tipo: TipoTransacao; _sum: { valor: Prisma.Decimal | null } }[]) {
  let entradas = 0;
  let saidas = 0;
  for (const g of grupos) {
    const v = Number(g._sum.valor ?? 0);
    if (g.tipo === TipoTransacao.ENTRADA) entradas += v;
    else saidas += v;
  }
  return { entradas, saidas };
}

/**
 * Resumo do dashboard. Todas as somas são feitas no banco (nada de carregar
 * todos os lançamentos na memória) e as consultas rodam em paralelo.
 *
 * Saldo do escritório = lançamentos pagos (entradas − saídas)
 *                     + parte do escritório das parcelas já recebidas.
 * A parte do cliente nunca entra no saldo: aparece em "a repassar".
 * Audiências e petições pagas aos advogados entram como saída.
 */
export async function getDashboardResumo(): Promise<DashboardResumo> {
  const hoje = hojeSaoPaulo();
  const diaHoje = dataParaDb(hoje);
  const [ano, mes] = hoje.split("-").map(Number);
  const pixPromessa = pixDosAdvogados();
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const inicioProxMes = new Date(Date.UTC(ano, mes, 1));
  const inicioJanela = new Date(Date.UTC(ano, mes - 6, 1)); // últimos 6 meses

  const [
    totaisTransacoes,
    totaisMes,
    escritorioRecebido,
    escritorioRecebidoMes,
    aRepassar,
    aReceber,
    fluxoBruto,
    proximasEntradas,
    repassesClientes,
    proximasAudiencias,
    audienciasAPagar,
    audienciasPagas,
    audienciasPagasMes,
    peticoesPendentes,
    peticoesPagas,
    peticoesPagasMes,
    recebiveisPendentes,
  ] = await Promise.all([
    prisma.transacao.groupBy({ by: ["tipo"], where: { status: StatusTransacao.PAGO }, _sum: { valor: true } }),
    prisma.transacao.groupBy({
      by: ["tipo"],
      where: { status: StatusTransacao.PAGO, dataCompetencia: { gte: inicioMes, lt: inicioProxMes } },
      _sum: { valor: true },
    }),
    prisma.parcela.aggregate({
      where: { statusRecebimento: StatusRecebimento.RECEBIDO },
      _sum: { valorEscritorio: true },
    }),
    prisma.parcela.aggregate({
      where: { statusRecebimento: StatusRecebimento.RECEBIDO, dataRecebimento: { gte: inicioMes, lt: inicioProxMes } },
      _sum: { valorEscritorio: true },
    }),
    prisma.parcela.aggregate({
      where: { statusRecebimento: StatusRecebimento.RECEBIDO, statusRepasse: StatusRepasse.PENDENTE },
      _sum: { valorCliente: true },
    }),
    prisma.parcela.aggregate({
      where: { statusRecebimento: StatusRecebimento.PENDENTE },
      _sum: { valorEscritorio: true },
    }),
    prisma.$queryRaw<{ mes: string; entradas: Prisma.Decimal | null; saidas: Prisma.Decimal | null }[]>`
      SELECT to_char(m, 'YYYY-MM') AS mes, SUM(entradas) AS entradas, SUM(saidas) AS saidas FROM (
        SELECT date_trunc('month', data_competencia) AS m,
               CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END AS entradas,
               CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END AS saidas
          FROM transacoes
         WHERE status = 'PAGO' AND data_competencia >= ${inicioJanela}
        UNION ALL
        SELECT date_trunc('month', data_recebimento), valor_escritorio, 0
          FROM parcelas
         WHERE status_recebimento = 'RECEBIDO' AND data_recebimento >= ${inicioJanela}
        UNION ALL
        SELECT date_trunc('month', data_pagamento), 0, valor
          FROM audiencias
         WHERE status_pagamento = 'PAGO' AND valor IS NOT NULL AND data_pagamento >= ${inicioJanela}
        UNION ALL
        SELECT date_trunc('month', data_pagamento), 0, valor
          FROM peticoes
         WHERE status = 'PAGA' AND valor IS NOT NULL AND data_pagamento >= ${inicioJanela}
      ) x
      GROUP BY 1`,
    prisma.parcela.findMany({
      where: { statusRecebimento: StatusRecebimento.PENDENTE },
      include: incluirParcela,
      orderBy: [{ vencimento: "asc" }, { numero: "asc" }],
      take: 20,
    }),
    prisma.parcela.findMany({
      where: { statusRepasse: StatusRepasse.PENDENTE },
      include: incluirParcela,
      // Recebidas (prontas para repassar) primeiro, depois por vencimento.
      orderBy: [{ statusRecebimento: "desc" }, { vencimento: "asc" }, { numero: "asc" }],
      take: 20,
    }),
    prisma.audiencia.findMany({
      where: { data: { gte: diaHoje } },
      orderBy: [{ data: "asc" }, { hora: "asc" }],
      take: 20,
    }),
    // Já aconteceu e ainda não foi paga ao advogado.
    prisma.audiencia.findMany({
      where: { data: { lt: diaHoje }, statusPagamento: StatusPagamento.PENDENTE },
      orderBy: { data: "asc" },
      take: 30,
    }),
    prisma.audiencia.aggregate({ where: { statusPagamento: StatusPagamento.PAGO }, _sum: { valor: true } }),
    prisma.audiencia.aggregate({
      where: { statusPagamento: StatusPagamento.PAGO, dataPagamento: { gte: inicioMes, lt: inicioProxMes } },
      _sum: { valor: true },
    }),
    prisma.peticao.findMany({
      where: { status: { in: [StatusPeticao.A_VALIDAR, StatusPeticao.A_PAGAR] } },
      // Falta validar primeiro, depois as mais antigas.
      orderBy: [{ status: "asc" }, { dataEntrega: "asc" }],
      take: 30,
    }),
    prisma.peticao.aggregate({ where: { status: StatusPeticao.PAGA }, _sum: { valor: true } }),
    prisma.peticao.aggregate({
      where: { status: StatusPeticao.PAGA, dataPagamento: { gte: inicioMes, lt: inicioProxMes } },
      _sum: { valor: true },
    }),
    prisma.transacao.findMany({
      where: { tipo: TipoTransacao.ENTRADA, status: StatusTransacao.PENDENTE },
      include: incluirTransacao,
      orderBy: { dataCompetencia: "asc" },
      take: 30,
    }),
  ]);

  const pix = await pixPromessa;
  const total = somaPorTipo(totaisTransacoes);
  const doMes = somaPorTipo(totaisMes);
  const escritorioTotal = Number(escritorioRecebido._sum.valorEscritorio ?? 0);
  const escritorioMes = Number(escritorioRecebidoMes._sum.valorEscritorio ?? 0);
  const audienciasTotal = Number(audienciasPagas._sum.valor ?? 0);
  const audienciasMes = Number(audienciasPagasMes._sum.valor ?? 0);
  const peticoesTotal = Number(peticoesPagas._sum.valor ?? 0);
  const peticoesMes = Number(peticoesPagasMes._sum.valor ?? 0);

  // Monta os 6 meses, inclusive os que não tiveram movimento.
  const porMes = new Map(fluxoBruto.map((r) => [r.mes, r]));
  const fluxoMensal: DashboardResumo["fluxoMensal"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - 1 - i, 1));
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const r = porMes.get(chave);
    fluxoMensal.push({
      mes: `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
      entradas: Number(r?.entradas ?? 0),
      saidas: Number(r?.saidas ?? 0),
    });
  }

  return {
    saldoAtual: total.entradas - total.saidas + escritorioTotal - audienciasTotal - peticoesTotal,
    entradasMes: doMes.entradas + escritorioMes,
    saidasMes: doMes.saidas + audienciasMes + peticoesMes,
    aRepassarClientes: Number(aRepassar._sum.valorCliente ?? 0),
    aReceberEscritorio: Number(aReceber._sum.valorEscritorio ?? 0),
    fluxoMensal,
    proximasEntradas: proximasEntradas.map(serializarParcelaResumo),
    repassesClientes: repassesClientes.map(serializarParcelaResumo),
    proximasAudiencias: proximasAudiencias.map((a) => serializarAudiencia(a, pix)),
    audienciasAPagar: audienciasAPagar.map((a) => serializarAudiencia(a, pix)),
    peticoesPendentes: peticoesPendentes.map((p) => serializarPeticao(p, pix)),
    recebiveisPendentes: recebiveisPendentes.map(serializarTransacao),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializarTransacao(t: any): any {
  return {
    id: t.id,
    tipo: t.tipo,
    valor: Number(t.valor),
    dataCompetencia: t.dataCompetencia.toISOString().slice(0, 10),
    dataPagamento: t.dataPagamento ? t.dataPagamento.toISOString().slice(0, 10) : "",
    status: t.status,
    descricao: t.descricao ?? "",
    processoNumero: t.processoNumero ?? "",
    clienteNome: t.clienteNome ?? "",
    reclamada: t.reclamada ?? "",
    anexoUrl: t.anexoUrl ?? "",
    anexoNome: t.anexoNome ?? "",
    categoria: { id: t.categoria.id, nome: t.categoria.nome, tipo: t.categoria.tipo },
    processo: t.processo
      ? {
          id: t.processo.id,
          numeroPje: t.processo.numeroPje,
          nomeAcao: t.processo.nomeAcao,
          cliente: { id: t.processo.cliente.id, nome: t.processo.cliente.nome },
        }
      : null,
    contato: t.contato ? { id: t.contato.id, nome: t.contato.nome, tipo: t.contato.tipo } : null,
  };
}
