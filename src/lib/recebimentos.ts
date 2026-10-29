import { Prisma, StatusRecebimento, StatusRepasse } from "@prisma/client";
import { prisma } from "./prisma";
import { calcularParcelas, paraCentavos, validarParcelas, type ParcelaCalculada, type ResultadoParcelas } from "./parcelas";
import { dataDoDb, dataParaDb, hojeSaoPaulo } from "./datas";
import type { ParcelaAcao, RecebimentoInput } from "./validations";

/** Erro de regra de negócio: vira resposta 400/404/409 com a mensagem para o usuário. */
export class ErroRecebimento extends Error {
  constructor(message: string, public status: 400 | 404 | 409 = 400) {
    super(message);
  }
}

// ---------- Criação ----------

/**
 * Recalcula as parcelas no servidor a partir do que veio do formulário
 * (nunca confia nos valores de escritório/cliente enviados pelo navegador).
 * Puro: não acessa o banco.
 */
export function montarParcelas(input: RecebimentoInput): ResultadoParcelas {
  let resultado: ResultadoParcelas;
  try {
    resultado = calcularParcelas({
      valorTotal: input.valorTotal,
      percentualEscritorio: input.percentualEscritorio,
      numeroParcelas: input.numeroParcelas,
      primeiroVencimento: input.primeiroVencimento,
      valoresParcelas: input.parcelas?.map((p) => p.valorParcela),
    });
  } catch (err) {
    throw new ErroRecebimento(err instanceof Error ? err.message : "Dados inválidos.");
  }

  // Datas ajustadas manualmente na prévia substituem as calculadas.
  if (input.parcelas) {
    resultado.parcelas = resultado.parcelas.map((p, i) => ({ ...p, vencimento: input.parcelas![i].vencimento }));
  }

  const erros = validarParcelas(resultado.valorTotal, resultado.parcelas);
  if (erros.length > 0) throw new ErroRecebimento(erros.join(" "));
  return resultado;
}

export async function criarRecebimento(input: RecebimentoInput) {
  const calc = montarParcelas(input);

  if (input.processoId) {
    const existe = await prisma.processo.findUnique({ where: { id: input.processoId }, select: { id: true } });
    if (!existe) throw new ErroRecebimento("Processo não encontrado.", 404);
  }

  const criado = await prisma.recebimento.create({
    data: {
      processoId: input.processoId ?? null,
      processoNumero: input.processoNumero ?? null,
      clienteNome: input.clienteNome,
      reclamada: input.reclamada ?? null,
      observacoes: input.observacoes ?? null,
      valorTotal: new Prisma.Decimal(calc.valorTotal),
      percentualEscritorio: new Prisma.Decimal(String(input.percentualEscritorio).replace(",", ".")),
      numeroParcelas: input.numeroParcelas,
      dataPrimeiroVencimento: dataParaDb(input.primeiroVencimento),
      diaVencimento: calc.diaVencimento,
      parcelas: {
        create: calc.parcelas.map((p: ParcelaCalculada) => ({
          numero: p.numero,
          vencimento: dataParaDb(p.vencimento),
          valorParcela: new Prisma.Decimal(p.valorParcela),
          valorEscritorio: new Prisma.Decimal(p.valorEscritorio),
          valorCliente: new Prisma.Decimal(p.valorCliente),
        })),
      },
    },
    include: { parcelas: { orderBy: { numero: "asc" } } },
  });

  return serializarRecebimento(criado);
}

// ---------- Consulta ----------

const incluirParcelas = { parcelas: { orderBy: { numero: "asc" as const } } };

export async function listarRecebimentos(limite = 100) {
  const lista = await prisma.recebimento.findMany({
    include: incluirParcelas,
    orderBy: { createdAt: "desc" },
    take: limite,
  });
  return lista.map(serializarRecebimento);
}

export async function obterRecebimento(id: string) {
  const r = await prisma.recebimento.findUnique({ where: { id }, include: incluirParcelas });
  if (!r) throw new ErroRecebimento("Recebimento não encontrado.", 404);
  return serializarRecebimento(r);
}

/**
 * Edita uma causa.
 * - Cliente, empresa, processo e observações: sempre.
 * - Valor, %, parcelas e datas: só enquanto nenhuma parcela foi recebida
 *   (as parcelas são recriadas do zero com o novo cálculo).
 */
export async function atualizarRecebimento(id: string, input: RecebimentoInput) {
  const atual = await prisma.recebimento.findUnique({ where: { id }, include: { parcelas: true } });
  if (!atual) throw new ErroRecebimento("Causa não encontrada.", 404);

  const textos = {
    clienteNome: input.clienteNome,
    reclamada: input.reclamada ?? null,
    processoNumero: input.processoNumero ?? null,
    processoId: input.processoId ?? null,
    observacoes: input.observacoes ?? null,
  };

  const bloqueada = atual.parcelas.some((p) => p.statusRecebimento === StatusRecebimento.RECEBIDO);
  if (bloqueada) {
    const mudouValores =
      paraCentavos(input.valorTotal) !== paraCentavos(atual.valorTotal.toFixed(2)) ||
      paraCentavos(input.percentualEscritorio) !== paraCentavos(atual.percentualEscritorio.toFixed(2)) ||
      input.numeroParcelas !== atual.numeroParcelas ||
      input.primeiroVencimento !== dataDoDb(atual.dataPrimeiroVencimento) ||
      input.parcelas !== undefined;
    if (mudouValores) {
      throw new ErroRecebimento(
        "Esta causa já tem parcela recebida: só dá para editar cliente, empresa, processo e observações. Para mudar uma data, use a parcela.",
        409
      );
    }
    await prisma.recebimento.update({ where: { id }, data: textos });
    return obterRecebimento(id);
  }

  const calc = montarParcelas(input);
  await prisma.$transaction([
    prisma.parcela.deleteMany({ where: { recebimentoId: id } }),
    prisma.recebimento.update({
      where: { id },
      data: {
        ...textos,
        valorTotal: new Prisma.Decimal(calc.valorTotal),
        percentualEscritorio: new Prisma.Decimal(String(input.percentualEscritorio).replace(",", ".")),
        numeroParcelas: input.numeroParcelas,
        dataPrimeiroVencimento: dataParaDb(input.primeiroVencimento),
        diaVencimento: calc.diaVencimento,
        parcelas: {
          create: calc.parcelas.map((p) => ({
            numero: p.numero,
            vencimento: dataParaDb(p.vencimento),
            valorParcela: new Prisma.Decimal(p.valorParcela),
            valorEscritorio: new Prisma.Decimal(p.valorEscritorio),
            valorCliente: new Prisma.Decimal(p.valorCliente),
          })),
        },
      },
    }),
  ]);
  return obterRecebimento(id);
}

export async function excluirRecebimento(id: string) {
  const { count } = await prisma.recebimento.deleteMany({ where: { id } });
  if (count === 0) throw new ErroRecebimento("Recebimento não encontrado.", 404);
}

// ---------- Ações na parcela ----------

/**
 * Aplica uma ação à parcela. Cada ação só acontece se a parcela estiver no estado certo
 * (checado na própria atualização, para dois cliques simultâneos não baterem).
 */
export async function aplicarAcaoParcela(id: string, acao: ParcelaAcao) {
  const R = StatusRecebimento;
  const P = StatusRepasse;

  let where: Prisma.ParcelaWhereInput;
  let data: Prisma.ParcelaUpdateManyMutationInput;
  let conflito: string;

  switch (acao.acao) {
    case "receber":
      where = { statusRecebimento: R.PENDENTE };
      data = { statusRecebimento: R.RECEBIDO, dataRecebimento: dataParaDb(acao.data ?? hojeSaoPaulo()) };
      conflito = "Esta parcela já está marcada como recebida.";
      break;
    case "desfazer_recebimento":
      where = { statusRecebimento: R.RECEBIDO, statusRepasse: P.PENDENTE };
      data = { statusRecebimento: R.PENDENTE, dataRecebimento: null };
      conflito = "Só dá para desfazer o recebimento de uma parcela recebida e ainda não repassada.";
      break;
    case "repassar":
      where = { statusRecebimento: R.RECEBIDO, statusRepasse: P.PENDENTE };
      data = { statusRepasse: P.REPASSADO, dataRepasse: dataParaDb(acao.data ?? hojeSaoPaulo()) };
      conflito = "O repasse só pode ser feito depois que a parcela for recebida, e uma única vez.";
      break;
    case "desfazer_repasse":
      where = { statusRepasse: P.REPASSADO };
      data = { statusRepasse: P.PENDENTE, dataRepasse: null, comprovanteRepasseUrl: null, comprovanteRepasseNome: null };
      conflito = "Esta parcela não está marcada como repassada.";
      break;
    case "alterar_vencimento":
      where = { statusRecebimento: R.PENDENTE };
      data = { vencimento: dataParaDb(acao.vencimento) };
      conflito = "Não dá para mudar o vencimento de uma parcela já recebida.";
      break;
  }

  const { count } = await prisma.parcela.updateMany({ where: { id, ...where }, data });
  if (count === 0) {
    const existe = await prisma.parcela.findUnique({ where: { id }, select: { id: true } });
    throw existe ? new ErroRecebimento(conflito, 409) : new ErroRecebimento("Parcela não encontrada.", 404);
  }

  const parcela = await prisma.parcela.findUniqueOrThrow({ where: { id } });
  return serializarParcela(parcela);
}

// ---------- Serialização (Decimal → string, Date → "AAAA-MM-DD") ----------

type ParcelaDb = Prisma.ParcelaGetPayload<object>;
type RecebimentoDb = Prisma.RecebimentoGetPayload<{ include: { parcelas: true } }>;

export function serializarParcela(p: ParcelaDb) {
  return {
    id: p.id,
    recebimentoId: p.recebimentoId,
    numero: p.numero,
    vencimento: dataDoDb(p.vencimento),
    valorParcela: p.valorParcela.toFixed(2),
    valorEscritorio: p.valorEscritorio.toFixed(2),
    valorCliente: p.valorCliente.toFixed(2),
    statusRecebimento: p.statusRecebimento,
    dataRecebimento: p.dataRecebimento ? dataDoDb(p.dataRecebimento) : null,
    statusRepasse: p.statusRepasse,
    dataRepasse: p.dataRepasse ? dataDoDb(p.dataRepasse) : null,
    comprovanteRepasseUrl: p.comprovanteRepasseUrl,
    comprovanteRepasseNome: p.comprovanteRepasseNome,
  };
}

export function serializarRecebimento(r: RecebimentoDb) {
  return {
    id: r.id,
    processoId: r.processoId,
    processoNumero: r.processoNumero,
    clienteNome: r.clienteNome,
    reclamada: r.reclamada,
    observacoes: r.observacoes,
    valorTotal: r.valorTotal.toFixed(2),
    percentualEscritorio: r.percentualEscritorio.toFixed(2),
    numeroParcelas: r.numeroParcelas,
    dataPrimeiroVencimento: dataDoDb(r.dataPrimeiroVencimento),
    diaVencimento: r.diaVencimento,
    createdAt: r.createdAt.toISOString(),
    parcelas: r.parcelas.map(serializarParcela),
  };
}

export type RecebimentoSerializado = ReturnType<typeof serializarRecebimento>;
export type ParcelaSerializada = ReturnType<typeof serializarParcela>;
