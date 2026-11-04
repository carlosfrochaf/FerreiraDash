import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { agruparNomes, chaveCliente } from "./clientes";
import { dataDoDb, dataParaDb } from "./datas";
import { ErroRecebimento as ErroNegocio } from "./recebimentos";
import type { ClienteInput } from "./validations";

type Db = PrismaClient | Prisma.TransactionClient;

/** Acha o cliente pelo nome (sem ligar para acento/maiúscula) ou cria. Nome vazio → null. */
export async function garantirCliente(db: Db, nome: string, extras: { pix?: string | null } = {}): Promise<string | null> {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo) return null;
  const chave = chaveCliente(limpo);
  const todos = await db.cliente.findMany({ select: { id: true, nome: true, pix: true } });
  const achado = todos.find((c) => chaveCliente(c.nome) === chave);
  if (achado) {
    if (!achado.pix && extras.pix) await db.cliente.update({ where: { id: achado.id }, data: { pix: extras.pix } });
    return achado.id;
  }
  const criado = await db.cliente.create({ data: { nome: limpo, pix: extras.pix ?? null } });
  return criado.id;
}

/**
 * Cria clientes para os nomes já usados em causas, audiências e petições que ainda não têm
 * cliente, e liga cada registro ao seu. Pode rodar de novo sem duplicar (roda no seed de cada deploy).
 */
export async function carregarClientesIniciais(db: PrismaClient = prisma): Promise<number> {
  const [recs, auds, pets] = await Promise.all([
    db.recebimento.findMany({ where: { clienteId: null }, select: { id: true, clienteNome: true, clientePix: true }, orderBy: { createdAt: "desc" } }),
    db.audiencia.findMany({ where: { clienteId: null }, select: { id: true, clienteNome: true } }),
    db.peticao.findMany({ where: { clienteId: null }, select: { id: true, clienteNome: true } }),
  ]);
  const grupos = agruparNomes([...recs, ...auds, ...pets].map((x) => x.clienteNome));
  let ligados = 0;
  for (const g of grupos) {
    const pix = recs.find((r) => chaveCliente(r.clienteNome) === g.chave && r.clientePix)?.clientePix ?? null;
    const id = await garantirCliente(db, g.nome, { pix });
    if (!id) continue;
    const ids = (lista: { id: string; clienteNome: string }[]) => lista.filter((x) => chaveCliente(x.clienteNome) === g.chave).map((x) => x.id);
    const [a, b, c] = await Promise.all([
      db.recebimento.updateMany({ where: { id: { in: ids(recs) } }, data: { clienteId: id } }),
      db.audiencia.updateMany({ where: { id: { in: ids(auds) } }, data: { clienteId: id } }),
      db.peticao.updateMany({ where: { id: { in: ids(pets) } }, data: { clienteId: id } }),
    ]);
    ligados += a.count + b.count + c.count;
  }
  return ligados;
}

/** Passa tudo do cliente `origemId` para `destinoId` (causas, audiências, petições, documentos) e apaga a origem. */
export async function juntarClientes(destinoId: string, origemId: string) {
  if (destinoId === origemId) throw new ErroNegocio("Escolha outro cliente para juntar.");
  return prisma.$transaction(async (tx) => {
    const [destino, origem] = await Promise.all([
      tx.cliente.findUnique({ where: { id: destinoId } }),
      tx.cliente.findUnique({ where: { id: origemId } }),
    ]);
    if (!destino || !origem) throw new ErroNegocio("Cliente não encontrado.", 404);
    const mover = { where: { clienteId: origemId }, data: { clienteId: destinoId } };
    await Promise.all([
      tx.recebimento.updateMany(mover),
      tx.audiencia.updateMany(mover),
      tx.peticao.updateMany(mover),
      tx.documento.updateMany(mover),
    ]);
    // Completa o que estiver vazio no destino com os dados da origem.
    const completar: Prisma.ClienteUpdateInput = {};
    for (const k of ["cpf", "telefone", "email", "endereco", "pix", "observacoes", "dataNascimento"] as const) {
      if (destino[k] == null && origem[k] != null) (completar as Record<string, unknown>)[k] = origem[k];
    }
    if (Object.keys(completar).length) await tx.cliente.update({ where: { id: destinoId }, data: completar });
    await tx.cliente.delete({ where: { id: origemId } });
  });
}

export function dadosCliente(input: ClienteInput): Prisma.ClienteUncheckedCreateInput {
  return {
    nome: input.nome,
    cpf: input.cpf ?? null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    endereco: input.endereco ?? null,
    dataNascimento: input.dataNascimento ? dataParaDb(input.dataNascimento) : null,
    pix: input.pix ?? null,
    observacoes: input.observacoes ?? null,
  };
}

export type ClienteSerializado = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  dataNascimento: string | null;
  pix: string | null;
  observacoes: string | null;
};

export function serializarCliente(c: Prisma.ClienteGetPayload<object>): ClienteSerializado {
  return {
    id: c.id,
    nome: c.nome,
    cpf: c.cpf,
    telefone: c.telefone,
    email: c.email,
    endereco: c.endereco,
    dataNascimento: c.dataNascimento ? dataDoDb(c.dataNascimento) : null,
    pix: c.pix,
    observacoes: c.observacoes,
  };
}

/** Nomes dos clientes, para sugerir nos formulários. */
export async function nomesDosClientes(): Promise<string[]> {
  const lista = await prisma.cliente.findMany({ select: { nome: true }, orderBy: { nome: "asc" }, take: 1000 });
  return lista.map((c) => c.nome);
}
