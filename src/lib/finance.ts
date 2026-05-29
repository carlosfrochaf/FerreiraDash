import {
  Prisma,
  StatusTransacao,
  TipoTransacao,
} from "@prisma/client";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "./prisma";
import type { DashboardResumo, TransacaoComRelacoes } from "@/types";
import { calcularRepasse } from "./repasse-calculator";

export { calcularRepasse };

export async function getDashboardResumo(): Promise<DashboardResumo> {
  const agora = new Date();
  const inicioMes = startOfMonth(agora);
  const fimMes = endOfMonth(agora);

  const transacoesPagas = await prisma.transacao.findMany({
    where: { status: StatusTransacao.PAGO },
    select: { tipo: true, valor: true, dataCompetencia: true },
  });

  let saldoAtual = 0;
  let entradasMes = 0;
  let saidasMes = 0;

  for (const t of transacoesPagas) {
    const valor = Number(t.valor);
    if (t.tipo === TipoTransacao.ENTRADA) {
      saldoAtual += valor;
    } else {
      saldoAtual -= valor;
    }

    if (t.dataCompetencia >= inicioMes && t.dataCompetencia <= fimMes) {
      if (t.tipo === TipoTransacao.ENTRADA) entradasMes += valor;
      else saidasMes += valor;
    }
  }

  const fluxoMensal: DashboardResumo["fluxoMensal"] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(agora, i);
    const ini = startOfMonth(ref);
    const fim = endOfMonth(ref);
    let entradas = 0;
    let saidas = 0;

    for (const t of transacoesPagas) {
      if (t.dataCompetencia >= ini && t.dataCompetencia <= fim) {
        const v = Number(t.valor);
        if (t.tipo === TipoTransacao.ENTRADA) entradas += v;
        else saidas += v;
      }
    }

    fluxoMensal.push({
      mes: format(ref, "MMM/yy", { locale: ptBR }),
      entradas,
      saidas,
    });
  }

  const repassesPendentes = await prisma.transacao.findMany({
    where: {
      categoria: { slug: "REPASSE_CLIENTE" },
      status: StatusTransacao.PENDENTE,
    },
    include: {
      categoria: true,
      processo: { include: { cliente: true } },
      contato: true,
    },
    orderBy: { dataCompetencia: "asc" },
    take: 30,
  });

  const audienciasPendentes = await prisma.transacao.findMany({
    where: {
      categoria: { slug: "AUDIENCIA" },
      status: StatusTransacao.PENDENTE,
    },
    include: {
      categoria: true,
      processo: { include: { cliente: true } },
      contato: true,
    },
    orderBy: { dataCompetencia: "asc" },
    take: 30,
  });

  const recebiveisPendentes = await prisma.transacao.findMany({
    where: {
      tipo: TipoTransacao.ENTRADA,
      status: StatusTransacao.PENDENTE,
    },
    include: {
      categoria: true,
      processo: { include: { cliente: true } },
      contato: true,
    },
    orderBy: { dataCompetencia: "asc" },
    take: 30,
  });

  const serializarTransacao = (t: any): any => ({
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
    categoria: {
      id: t.categoria.id,
      nome: t.categoria.nome,
      tipo: t.categoria.tipo,
    },
    processo: t.processo
      ? {
          id: t.processo.id,
          numeroPje: t.processo.numeroPje,
          nomeAcao: t.processo.nomeAcao,
          cliente: {
            id: t.processo.cliente.id,
            nome: t.processo.cliente.nome,
          },
        }
      : null,
    contato: t.contato
      ? {
          id: t.contato.id,
          nome: t.contato.nome,
          tipo: t.contato.tipo,
        }
      : null,
  });

  return {
    saldoAtual,
    entradasMes,
    saidasMes,
    fluxoMensal,
    repassesPendentes: repassesPendentes.map(serializarTransacao),
    audienciasPendentes: audienciasPendentes.map(serializarTransacao),
    recebiveisPendentes: recebiveisPendentes.map(serializarTransacao),
  };
}

export async function criarRepasseComTransacoes(input: {
  processoId: string;
  valorTotalRecebido: number;
  percentualEscritorio: number;
  dataRecebimento: Date;
  observacoes?: string;
}) {
  const { valorEscritorio, valorCliente } = calcularRepasse(
    input.valorTotalRecebido,
    input.percentualEscritorio
  );

  const [processo, categorias] = await Promise.all([
    prisma.processo.findUniqueOrThrow({
      where: { id: input.processoId },
      include: { cliente: true },
    }),
    prisma.categoria.findMany({
      where: {
        slug: { in: ["ALVARA_CAUSA_GANHA", "HONORARIOS_ESCRITORIO", "REPASSE_CLIENTE"] },
      },
    }),
  ]);

  const catAlvara = categorias.find((c) => c.slug === "ALVARA_CAUSA_GANHA");
  const catHonorarios = categorias.find((c) => c.slug === "HONORARIOS_ESCRITORIO");
  const catRepasse = categorias.find((c) => c.slug === "REPASSE_CLIENTE");

  if (!catAlvara || !catHonorarios || !catRepasse) {
    throw new Error("Categorias de sistema necessárias para repasse não foram encontradas no banco de dados.");
  }

  return prisma.$transaction(async (tx) => {
    const repasse = await tx.repasse.create({
      data: {
        processoId: input.processoId,
        valorTotalRecebido: new Prisma.Decimal(input.valorTotalRecebido),
        percentualEscritorio: new Prisma.Decimal(input.percentualEscritorio),
        valorEscritorio: new Prisma.Decimal(valorEscritorio),
        valorCliente: new Prisma.Decimal(valorCliente),
        dataRecebimento: input.dataRecebimento,
        observacoes: input.observacoes,
      },
    });

    const entradaAlvara = await tx.transacao.create({
      data: {
        tipo: TipoTransacao.ENTRADA,
        categoriaId: catAlvara.id,
        valor: new Prisma.Decimal(input.valorTotalRecebido),
        dataCompetencia: input.dataRecebimento,
        dataPagamento: input.dataRecebimento,
        status: StatusTransacao.PAGO,
        descricao: `Alvará recebido — ${processo.numeroPje}`,
        processoNumero: processo.numeroPje,
        clienteNome: processo.cliente.nome,
        processoId: input.processoId,
        contatoId: processo.clienteId,
        repasseId: repasse.id,
      },
    });

    const entradaHonorarios = await tx.transacao.create({
      data: {
        tipo: TipoTransacao.ENTRADA,
        categoriaId: catHonorarios.id,
        valor: new Prisma.Decimal(valorEscritorio),
        dataCompetencia: input.dataRecebimento,
        status: StatusTransacao.PAGO,
        descricao: `Honorários escritório (${input.percentualEscritorio}%) — ${processo.numeroPje}`,
        processoNumero: processo.numeroPje,
        clienteNome: processo.cliente.nome,
        processoId: input.processoId,
        repasseId: repasse.id,
      },
    });

    const saidaRepasse = await tx.transacao.create({
      data: {
        tipo: TipoTransacao.SAIDA,
        categoriaId: catRepasse.id,
        valor: new Prisma.Decimal(valorCliente),
        dataCompetencia: input.dataRecebimento,
        status: StatusTransacao.PENDENTE,
        descricao: `Repasse ao cliente ${processo.cliente.nome} — ${processo.numeroPje}`,
        processoNumero: processo.numeroPje,
        clienteNome: processo.cliente.nome,
        processoId: input.processoId,
        contatoId: processo.clienteId,
        repasseId: repasse.id,
      },
    });

    return { repasse, entradaAlvara, entradaHonorarios, saidaRepasse };
  });
}
