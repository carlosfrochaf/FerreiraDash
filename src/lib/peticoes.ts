import { Prisma, StatusPeticao } from "@prisma/client";
import { prisma } from "./prisma";
import { centavosParaString, paraCentavos } from "./parcelas";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "./datas";
import type { PeticaoAcao, PeticaoInput } from "./validations";
import { ErroRecebimento as ErroNegocio } from "./recebimentos";
import { chaveAdvogado, pixDosAdvogados, salvarPixAdvogado } from "./advogados";

export { ErroNegocio };

export type PeticaoSerializada = {
  id: string;
  advogadoNome: string;
  advogadoPix: string | null;
  clienteNome: string;
  reclamada: string | null;
  processoNumero: string | null;
  descricao: string;
  dataEntrega: string; // AAAA-MM-DD
  valor: string | null; // "300.00"
  status: "A_VALIDAR" | "A_PAGAR" | "PAGA";
  dataValidacao: string | null;
  dataPagamento: string | null;
  observacoes: string | null;
};

type PeticaoDb = Prisma.PeticaoGetPayload<object>;

export function serializarPeticao(p: PeticaoDb, pix: Record<string, string> = {}): PeticaoSerializada {
  return {
    id: p.id,
    advogadoNome: p.advogadoNome,
    advogadoPix: pix[chaveAdvogado(p.advogadoNome)] ?? null,
    clienteNome: p.clienteNome,
    reclamada: p.reclamada,
    processoNumero: p.processoNumero,
    descricao: p.descricao,
    dataEntrega: dataDoDb(p.dataEntrega),
    valor: p.valor ? p.valor.toFixed(2) : null,
    status: p.status,
    dataValidacao: p.dataValidacao ? dataDoDb(p.dataValidacao) : null,
    dataPagamento: p.dataPagamento ? dataDoDb(p.dataPagamento) : null,
    observacoes: p.observacoes,
  };
}

function valorParaDb(v: PeticaoInput["valor"]): Prisma.Decimal | null {
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

/** Converte o formulário em dados do banco, mantendo a data de pagamento coerente com a situação. */
function dadosDoInput(input: PeticaoInput, atual?: PeticaoDb) {
  const valor = valorParaDb(input.valor);
  if (input.status === "PAGA" && !valor) throw new ErroNegocio("Informe o valor para marcar como paga.");
  const hoje = dataParaDb(hojeSaoPaulo());
  return {
    advogadoNome: input.advogadoNome,
    clienteNome: input.clienteNome,
    reclamada: input.reclamada ?? null,
    processoNumero: input.processoNumero ?? null,
    descricao: input.descricao,
    dataEntrega: dataParaDb(input.dataEntrega),
    observacoes: input.observacoes ?? null,
    valor,
    status: input.status as StatusPeticao,
    dataPagamento:
      input.status === "PAGA" ? (input.dataPagamento ? dataParaDb(input.dataPagamento) : (atual?.dataPagamento ?? hoje)) : null,
  };
}

export async function criarPeticao(input: PeticaoInput) {
  const criada = await prisma.peticao.create({ data: dadosDoInput(input) });
  await salvarPixAdvogado(input.advogadoNome, input.advogadoPix);
  return serializarPeticao(criada, await pixDosAdvogados());
}

export async function atualizarPeticao(id: string, input: PeticaoInput) {
  const atual = await prisma.peticao.findUnique({ where: { id } });
  if (!atual) throw new ErroNegocio("Petição não encontrada.", 404);
  const salva = await prisma.peticao.update({ where: { id }, data: dadosDoInput(input, atual) });
  await salvarPixAdvogado(input.advogadoNome, input.advogadoPix);
  return serializarPeticao(salva, await pixDosAdvogados());
}

export async function excluirPeticao(id: string) {
  const { count } = await prisma.peticao.deleteMany({ where: { id } });
  if (count === 0) throw new ErroNegocio("Petição não encontrada.", 404);
}

/**
 * Não pago → (pagar) → Pago. O pagamento pode ser desfeito.
 */
export async function aplicarAcaoPeticao(id: string, acao: PeticaoAcao) {
  const S = StatusPeticao;
  let where: Prisma.PeticaoWhereInput;
  let data: Prisma.PeticaoUpdateManyMutationInput;
  let conflito: string;

  switch (acao.acao) {
    case "pagar":
      where = { status: { in: [S.A_VALIDAR, S.A_PAGAR] }, valor: { not: null } };
      data = { status: S.PAGA, dataPagamento: dataParaDb(acao.data ?? hojeSaoPaulo()) };
      conflito = "";
      break;
    case "desfazer_pagamento":
      where = { status: S.PAGA };
      data = { status: S.A_PAGAR, dataPagamento: null };
      conflito = "Esta petição não está marcada como paga.";
      break;
  }

  const { count } = await prisma.peticao.updateMany({ where: { id, ...where }, data });
  if (count === 0) {
    const p = await prisma.peticao.findUnique({ where: { id } });
    if (!p) throw new ErroNegocio("Petição não encontrada.", 404);
    if (acao.acao === "pagar") {
      throw new ErroNegocio(p.status === S.PAGA ? "Esta petição já está paga." : "Defina o valor antes de marcar como paga.", 409);
    }
    throw new ErroNegocio(conflito, 409);
  }
  return serializarPeticao(await prisma.peticao.findUniqueOrThrow({ where: { id } }), await pixDosAdvogados());
}

export async function listarPeticoes() {
  const [lista, pix] = await Promise.all([
    prisma.peticao.findMany({ orderBy: [{ dataEntrega: "desc" }, { createdAt: "desc" }], take: 500 }),
    pixDosAdvogados(),
  ]);
  return lista.map((p) => serializarPeticao(p, pix));
}
