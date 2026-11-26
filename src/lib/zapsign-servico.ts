// Envio assinado no ZapSign → contrato na lista, cliente (com os PDFs nos documentos), ficha em rascunho e aviso. Só no servidor.
import { TipoContato, type TipoDocumento } from "@prisma/client";
import { prisma } from "./prisma";
import { avisarTodos } from "./push";
import { TAMANHO_MAXIMO } from "./documentos";
import { apagarArquivo, enviarArquivo, storageConfigurado } from "./storage";
import { hojeSaoPaulo } from "./datas";
import { chaveCliente } from "./clientes";
import { arquivosAssinados, arquivosDoEnvio, chaveTelefone, detalharDocumento, escolherCliente, segredoDoAviso, type ZapDocumento } from "./zapsign";

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
  const ficha = await levarParaCliente(doc, pessoa).catch((err) => {
    console.error("[zapsign] cliente/documentos", err);
    return null;
  });
  await avisarTodos([
    {
      title: "✍️ Contrato assinado",
      body: ficha ? `${ficha.nome}${ficha.novo ? " (cliente novo)" : ""}. Preencher a ficha.` : pessoa.nome,
      url: ficha ? `/clientes/${ficha.clienteId}/fichas/${ficha.fichaId}` : "/contratos",
      tag: `zapsign-${doc.token}`,
    },
  ]).catch((err) => console.error("[zapsign] aviso", err));
  return { situacao: "pronto", id: criado.id };
}

/** Aviso do ZapSign: não confia no corpo, consulta o envio pela API. */
export async function processarAssinatura(token: string, docToken: string): Promise<Resultado> {
  return gravar(await detalharDocumento(token, docToken));
}

type Pessoa = NonNullable<ReturnType<typeof escolherCliente>>;
type ClienteBusca = { id: string; nome: string; cpf: string | null; telefone: string | null };

/** Cliente já cadastrado: CPF, depois telefone, depois o mesmo nome (sem acento/maiúscula). */
export function clienteExistente<T extends ClienteBusca>(todos: T[], p: Pessoa): T | null {
  return (
    (p.cpf && todos.find((c) => digitos(c.cpf) === p.cpf)) ||
    (p.telefone && todos.find((c) => chaveTelefone(c.telefone) === p.telefone)) ||
    todos.find((c) => chaveCliente(c.nome) === chaveCliente(p.nome)) ||
    null
  );
}

/** Acha o cliente (CPF, depois telefone) ou cadastra; completa o que faltava sem sobrescrever. */
async function acharOuCriarCliente(p: Pessoa): Promise<{ id: string; nome: string; novo: boolean }> {
  const todos = await prisma.cliente.findMany({ select: { id: true, nome: true, cpf: true, telefone: true, email: true } });
  const achado = clienteExistente(todos, p);
  if (achado) {
    await prisma.cliente.update({
      where: { id: achado.id },
      data: {
        ...(!achado.cpf && p.cpf && { cpf: p.cpf }),
        ...(!achado.telefone && p.telefone && { telefone: p.telefone }),
        ...(!achado.email && p.email && { email: p.email }),
      },
    });
    return { id: achado.id, nome: achado.nome, novo: false };
  }
  const novo = await prisma.cliente.create({ data: { nome: p.nome, cpf: p.cpf, telefone: p.telefone, email: p.email } });
  return { id: novo.id, nome: novo.nome, novo: true };
}

async function baixarPdf(url: string): Promise<Blob | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // Confere que é PDF de verdade e cabe no limite.
  if (buf.length === 0 || buf.length > TAMANHO_MAXIMO || buf.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
  return new Blob([new Uint8Array(buf)], { type: "application/pdf" });
}

/**
 * Leva o envio assinado para o cliente: cadastro, PDFs nos documentos (se o armazenamento estiver
 * configurado) e ficha em rascunho. Seguro para repetir: arquivo e ficha não entram duas vezes.
 */
export async function levarParaCliente(doc: ZapDocumento, pessoa: Pessoa): Promise<{ clienteId: string; fichaId: string; nome: string; novo: boolean; novos: number }> {
  const cliente = await acharOuCriarCliente(pessoa);
  let novos = 0;
  if (storageConfigurado()) {
    const arquivos = arquivosAssinados(doc);
    const ja = new Set(
      (await prisma.documento.findMany({ where: { origemExterna: { in: arquivos.map((a) => a.origem) } }, select: { origemExterna: true } })).map((d) => d.origemExterna),
    );
    for (const a of arquivos.filter((x) => !ja.has(x.origem))) {
      const pdf = await baixarPdf(a.url);
      if (!pdf) {
        console.error("[zapsign] arquivo não baixou ou não é PDF", a.origem);
        continue;
      }
      const id = crypto.randomUUID();
      const nomeSeguro = a.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
      const caminho = `clientes/${cliente.id}/${id}-${nomeSeguro}`;
      await enviarArquivo(caminho, pdf, "application/pdf");
      try {
        await prisma.documento.create({
          data: { id, clienteId: cliente.id, tipo: a.tipo as TipoDocumento, nome: a.nome, caminho, mime: "application/pdf", tamanho: pdf.size, origemExterna: a.origem },
        });
        novos++;
      } catch (e) {
        // Outro aviso igual chegou junto e já gravou: desfaz este arquivo.
        await apagarArquivo(caminho).catch(() => {});
        if ((e as { code?: string }).code !== "P2002") throw e;
      }
    }
  }
  // Ficha: reaproveita o rascunho; cria um novo só se chegou arquivo novo ou o cliente ainda não tem ficha.
  const rascunho = await prisma.ficha.findFirst({ where: { clienteId: cliente.id, situacao: "RASCUNHO" }, orderBy: { createdAt: "desc" }, select: { id: true } });
  const qualquer = rascunho ?? (await prisma.ficha.findFirst({ where: { clienteId: cliente.id }, orderBy: { createdAt: "desc" }, select: { id: true } }));
  const ficha =
    rascunho ??
    (novos > 0 || !qualquer
      ? await prisma.ficha.create({ data: { clienteId: cliente.id, dados: { dataAtendimento: hojeSaoPaulo() } }, select: { id: true } })
      : qualquer);
  return { clienteId: cliente.id, fichaId: ficha!.id, nome: cliente.nome, novo: cliente.novo, novos };
}

/** Contrato já gravado antes desta mudança: consulta o ZapSign de novo e leva para o cliente. */
export async function reprocessarContrato(docToken: string): Promise<{ clienteId: string; fichaId: string; novos: number } | { erro: string }> {
  const cfg = configZapsign();
  if (!cfg) return { erro: "ZapSign não configurado." };
  const doc = await detalharDocumento(cfg.token, docToken);
  if (doc.status !== "signed") return { erro: "ainda não assinado por todos" };
  const pessoa = escolherCliente(doc.signers ?? []);
  if (!pessoa) return { erro: "sem signatário" };
  const r = await levarParaCliente(doc, pessoa);
  return { clienteId: r.clienteId, fichaId: r.fichaId, novos: r.novos };
}
