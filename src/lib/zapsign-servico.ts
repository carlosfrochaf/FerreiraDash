// Envio assinado no ZapSign → contrato na lista, cliente em Contatos e aviso no celular. Só no servidor.
import { TipoContato } from "@prisma/client";
import { prisma } from "./prisma";
import { avisarTodos } from "./push";
import { arquivosDoEnvio, chaveTelefone, detalharDocumento, escolherCliente, segredoDoAviso, type ZapDocumento } from "./zapsign";

export const ID_ZAPSIGN = "zapsign";

/** Token (chave ZAPSIGN_TOKEN na Vercel) e segredo do aviso; null se faltar. */
export function configZapsign(): { token: string; segredo: string } | null {
  const token = process.env.ZAPSIGN_TOKEN?.trim();
  const cron = process.env.CRON_SECRET;
  if (!token || !cron) return null;
  return { token, segredo: segredoDoAviso(cron) };
}

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Acha o cliente em Contatos (CPF, depois telefone) ou cadastra; completa o que faltava sem sobrescrever. */
async function contatoDoCliente(p: NonNullable<ReturnType<typeof escolherCliente>>): Promise<string> {
  const clientes = await prisma.contato.findMany({
    where: { tipo: TipoContato.CLIENTE },
    select: { id: true, cpfCnpj: true, telefone: true, email: true },
  });
  const achado =
    (p.cpf && clientes.find((c) => digitos(c.cpfCnpj) === p.cpf)) ||
    (p.telefone && clientes.find((c) => chaveTelefone(c.telefone) === p.telefone)) ||
    null;
  if (achado) {
    await prisma.contato.update({
      where: { id: achado.id },
      data: {
        ...(!achado.cpfCnpj && p.cpf && { cpfCnpj: p.cpf }),
        ...(!achado.telefone && p.telefone && { telefone: p.telefone }),
        ...(!achado.email && p.email && { email: p.email }),
      },
    });
    return achado.id;
  }
  const novo = await prisma.contato.create({
    data: { nome: p.nome, tipo: TipoContato.CLIENTE, cpfCnpj: p.cpf, telefone: p.telefone, email: p.email, observacoes: "Cadastrado pelo ZapSign." },
  });
  return novo.id;
}

export type Resultado = { situacao: "ignorado" | "pronto"; motivo?: string; id?: string };

/** Grava um envio já assinado. Seguro para repetir: o mesmo envio nunca entra duas vezes. */
async function gravar(doc: ZapDocumento): Promise<Resultado> {
  if (doc.status !== "signed") return { situacao: "ignorado", motivo: "ainda não assinado por todos" };
  const pessoa = escolherCliente(doc.signers ?? []);
  if (!pessoa) return { situacao: "ignorado", motivo: "sem signatário" };
  if (await prisma.contratoAssinado.findUnique({ where: { docToken: doc.token }, select: { id: true } })) {
    return { situacao: "ignorado", motivo: "já recebido" };
  }
  const contatoId = await contatoDoCliente(pessoa);
  let criado;
  try {
    criado = await prisma.contratoAssinado.create({
      data: {
        docToken: doc.token,
        titulo: (doc.name?.trim() || "Contrato").replace(/\.pdf$/i, ""),
        clienteNome: pessoa.nome,
        clienteCpf: pessoa.cpf,
        clienteTelefone: pessoa.telefone,
        clienteEmail: pessoa.email,
        contatoId,
        arquivos: arquivosDoEnvio(doc),
        assinadoEm: new Date(),
      },
      select: { id: true },
    });
  } catch (e) {
    // Outro aviso igual chegou junto e já gravou.
    if ((e as { code?: string }).code === "P2002") return { situacao: "ignorado", motivo: "já recebido" };
    throw e;
  }
  await avisarTodos([{ title: "✍️ Contrato assinado", body: pessoa.nome, url: "/contratos", tag: `zapsign-${doc.token}` }]).catch((err) =>
    console.error("[zapsign] aviso", err),
  );
  return { situacao: "pronto", id: criado.id };
}

/** Aviso do ZapSign: não confia no corpo, consulta o envio pela API. */
export async function processarAssinatura(token: string, docToken: string): Promise<Resultado> {
  return gravar(await detalharDocumento(token, docToken));
}
