import { Prisma, StatusPeticao } from "@prisma/client";
import { prisma } from "./prisma";
import { centavosParaString, paraCentavos } from "./parcelas";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "./datas";
import type { PeticaoAcao, PeticaoInput } from "./validations";
import { ErroRecebimento as ErroNegocio } from "./recebimentos";
import { chaveAdvogado, pixDosAdvogados, salvarPixAdvogado } from "./advogados";
import { entradaSemValores, filtroDoUsuario, semValores } from "./acesso-dados";
import type { UsuarioLogado } from "./usuario-atual";
import type { Opcoes } from "./audiencias";
import { garantirCliente } from "./clientes-servico";

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
  clienteId: string | null;
  /** Arquivos da petição enviados ao app (documentos ligados a ela). */
  arquivos: { id: string; nome: string }[];
};

type PeticaoDb = Prisma.PeticaoGetPayload<object> & { documentos?: { id: string; nome: string }[] };

/** Inclua nas buscas para trazer os arquivos da petição. */
export const COM_ARQUIVOS = { documentos: { select: { id: true, nome: true }, orderBy: { createdAt: "desc" as const } } };

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
    clienteId: p.clienteId,
    arquivos: p.documentos ?? [],
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

export async function criarPeticao(entrada: PeticaoInput, op: Opcoes = {}) {
  const input = op.semValores ? ({ ...entradaSemValores(entrada), status: "A_PAGAR" } as PeticaoInput) : entrada;
  const criada = await prisma.peticao.create({
    data: { ...dadosDoInput(input), clienteId: await garantirCliente(prisma, input.clienteNome) },
  });
  if (!op.semValores) await salvarPixAdvogado(input.advogadoNome, input.advogadoPix);
  return serializarPeticao(criada, await pixDosAdvogados());
}

export async function atualizarPeticao(id: string, entrada: PeticaoInput, op: Opcoes = {}) {
  const atual = await prisma.peticao.findUnique({ where: { id } });
  if (!atual) throw new ErroNegocio("Petição não encontrada.", 404);
  // Sem permissão de valores, mantém valor e situação de pagamento que já estavam.
  const input = op.semValores ? ({ ...entradaSemValores(entrada), status: "A_PAGAR" } as PeticaoInput) : entrada;
  const dados = { ...dadosDoInput(input, atual), ...(op.semValores ? { valor: atual.valor, status: atual.status, dataPagamento: atual.dataPagamento } : {}) };
  const salva = await prisma.peticao.update({
    where: { id },
    data: { ...dados, clienteId: await garantirCliente(prisma, input.clienteNome) },
  });
  if (!op.semValores) await salvarPixAdvogado(input.advogadoNome, input.advogadoPix);
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

export async function listarPeticoes(u?: UsuarioLogado) {
  const [lista, pix] = await Promise.all([
    prisma.peticao.findMany({ where: u ? filtroDoUsuario(u) : {}, include: COM_ARQUIVOS, orderBy: [{ dataEntrega: "desc" }, { createdAt: "desc" }], take: 500 }),
    pixDosAdvogados(),
  ]);
  return lista.map((p) => (u ? semValores(serializarPeticao(p, pix), u.perfil) : serializarPeticao(p, pix)));
}
