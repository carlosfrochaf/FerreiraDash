import { Prisma, StatusPagamento } from "@prisma/client";
import { prisma } from "./prisma";
import { centavosParaString, paraCentavos } from "./parcelas";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "./datas";
import type { AudienciaAcao, AudienciaInput } from "./validations";
import { ErroRecebimento as ErroNegocio } from "./recebimentos";

export { ErroNegocio };

export type AudienciaSerializada = {
  id: string;
  data: string; // AAAA-MM-DD
  hora: string | null;
  advogadoNome: string;
  clienteNome: string;
  reclamada: string | null;
  processoNumero: string | null;
  valor: string | null; // "350.00"
  statusPagamento: "PENDENTE" | "PAGO";
  dataPagamento: string | null;
  observacoes: string | null;
};

type AudienciaDb = Prisma.AudienciaGetPayload<object>;

export function serializarAudiencia(a: AudienciaDb): AudienciaSerializada {
  return {
    id: a.id,
    data: dataDoDb(a.data),
    hora: a.hora,
    advogadoNome: a.advogadoNome,
    clienteNome: a.clienteNome,
    reclamada: a.reclamada,
    processoNumero: a.processoNumero,
    valor: a.valor ? a.valor.toFixed(2) : null,
    statusPagamento: a.statusPagamento,
    dataPagamento: a.dataPagamento ? dataDoDb(a.dataPagamento) : null,
    observacoes: a.observacoes,
  };
}

function valorParaDb(v: AudienciaInput["valor"]): Prisma.Decimal | null {
  if (v === undefined) return null;
  let c: bigint;
  try {
    c = paraCentavos(v);
  } catch {
    throw new ErroNegocio("Valor inválido.");
  }
  if (c < BigInt(0)) throw new ErroNegocio("O valor não pode ser negativo.");
  return c === BigInt(0) ? null : new Prisma.Decimal(centavosParaString(c));
}

function dadosDoInput(input: AudienciaInput) {
  return {
    data: dataParaDb(input.data),
    hora: input.hora ?? null,
    advogadoNome: input.advogadoNome,
    clienteNome: input.clienteNome,
    reclamada: input.reclamada ?? null,
    processoNumero: input.processoNumero ?? null,
    observacoes: input.observacoes ?? null,
    valor: valorParaDb(input.valor),
  };
}

export async function criarAudiencia(input: AudienciaInput) {
  return serializarAudiencia(await prisma.audiencia.create({ data: dadosDoInput(input) }));
}

export async function atualizarAudiencia(id: string, input: AudienciaInput) {
  const atual = await prisma.audiencia.findUnique({ where: { id } });
  if (!atual) throw new ErroNegocio("Audiência não encontrada.", 404);
  const dados = dadosDoInput(input);
  if (atual.statusPagamento === StatusPagamento.PAGO && !dados.valor) {
    throw new ErroNegocio("Esta audiência já foi paga: o valor não pode ficar em branco.");
  }
  return serializarAudiencia(await prisma.audiencia.update({ where: { id }, data: dados }));
}

export async function excluirAudiencia(id: string) {
  const { count } = await prisma.audiencia.deleteMany({ where: { id } });
  if (count === 0) throw new ErroNegocio("Audiência não encontrada.", 404);
}

export async function aplicarAcaoAudiencia(id: string, acao: AudienciaAcao) {
  if (acao.acao === "pagar") {
    const { count } = await prisma.audiencia.updateMany({
      where: { id, statusPagamento: StatusPagamento.PENDENTE, valor: { not: null } },
      data: { statusPagamento: StatusPagamento.PAGO, dataPagamento: dataParaDb(acao.data ?? hojeSaoPaulo()) },
    });
    if (count === 0) {
      const a = await prisma.audiencia.findUnique({ where: { id } });
      if (!a) throw new ErroNegocio("Audiência não encontrada.", 404);
      throw new ErroNegocio(a.valor ? "Esta audiência já está paga." : "Defina o valor antes de marcar como paga.", 409);
    }
  } else {
    const { count } = await prisma.audiencia.updateMany({
      where: { id, statusPagamento: StatusPagamento.PAGO },
      data: { statusPagamento: StatusPagamento.PENDENTE, dataPagamento: null },
    });
    if (count === 0) throw new ErroNegocio("Esta audiência não está marcada como paga.", 409);
  }
  return serializarAudiencia(await prisma.audiencia.findUniqueOrThrow({ where: { id } }));
}

export async function listarAudiencias() {
  const lista = await prisma.audiencia.findMany({ orderBy: [{ data: "desc" }, { hora: "desc" }], take: 300 });
  return lista.map(serializarAudiencia);
}

/** Nomes já usados, para sugerir no formulário. */
export async function sugestoesAudiencia() {
  const [advogados, advogadosPeticoes, causas, audienciasAnteriores] = await Promise.all([
    prisma.audiencia.findMany({ distinct: ["advogadoNome"], select: { advogadoNome: true }, orderBy: { advogadoNome: "asc" }, take: 100 }),
    prisma.peticao.findMany({ distinct: ["advogadoNome"], select: { advogadoNome: true }, take: 100 }),
    prisma.recebimento.findMany({
      distinct: ["clienteNome"],
      select: { clienteNome: true, reclamada: true, processoNumero: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.audiencia.findMany({ distinct: ["clienteNome"], select: { clienteNome: true, reclamada: true, processoNumero: true }, take: 200 }),
  ]);
  // Processos conhecidos (das causas e de audiências anteriores), para preencher cliente e empresa.
  const processos = new Map<string, { clienteNome: string; reclamada: string | null }>();
  for (const r of [...audienciasAnteriores, ...causas]) {
    if (r.processoNumero) processos.set(r.processoNumero, { clienteNome: r.clienteNome, reclamada: r.reclamada });
  }
  return {
    advogados: [...new Set([...advogados, ...advogadosPeticoes].map((a) => a.advogadoNome))].sort((x, y) => x.localeCompare(y, "pt-BR")),
    processos: [...processos.entries()].map(([numero, v]) => ({ numero, ...v })),
  };
}
