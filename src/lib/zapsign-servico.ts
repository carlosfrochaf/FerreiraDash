// Documento assinado no ZapSign → cliente, documentos, ficha e aviso. Só no servidor.
import { TipoDocumento } from "@prisma/client";
import { prisma } from "./prisma";
import { abrir } from "./cifra";
import { segredoSessao } from "./sessao";
import { TAMANHO_MAXIMO } from "./documentos";
import { apagarArquivo, enviarArquivo, storageConfigurado } from "./storage";
import { hojeSaoPaulo } from "./datas";
import { avisarUsuarios } from "./fichas-servico";
import { arquivosAssinados, chaveTelefone, detalharDocumento, escolherCliente } from "./zapsign";

export const ID_ZAPSIGN = "zapsign";

/** Token e segredo do aviso, ou null se o escritório não conectou o ZapSign. */
export async function lerZapsign(): Promise<{ token: string; segredo: string } | null> {
  const i = await prisma.integracao.findUnique({ where: { id: ID_ZAPSIGN } });
  const chave = segredoSessao();
  if (!i || !chave) return null;
  try {
    return { token: abrir(i.tokenCifrado, chave), segredo: i.segredoAviso };
  } catch {
    console.error("[zapsign] não foi possível abrir o token (SESSION_SECRET mudou?)");
    return null;
  }
}

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");

async function acharOuCriarCliente(p: NonNullable<ReturnType<typeof escolherCliente>>): Promise<{ id: string; nome: string; novo: boolean }> {
  const todos = await prisma.cliente.findMany({ select: { id: true, nome: true, cpf: true, telefone: true } });
  const porCpf = p.cpf ? todos.find((c) => digitos(c.cpf) === p.cpf) : undefined;
  const porTel = !porCpf && p.telefone ? todos.find((c) => chaveTelefone(c.telefone) === p.telefone) : undefined;
  const achado = porCpf ?? porTel;
  if (achado) {
    // Completa o que faltava no cadastro, sem sobrescrever.
    const atual = await prisma.cliente.findUniqueOrThrow({ where: { id: achado.id } });
    await prisma.cliente.update({
      where: { id: achado.id },
      data: {
        ...(!atual.cpf && p.cpf && { cpf: p.cpf }),
        ...(!atual.telefone && p.telefone && { telefone: p.telefone }),
        ...(!atual.email && p.email && { email: p.email }),
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

export type ResultadoAssinatura = { situacao: "ignorado" | "pronto"; motivo?: string; clienteId?: string; novos?: number };

/** Processa um documento do ZapSign. Seguro para repetir: o mesmo arquivo nunca entra duas vezes. */
export async function processarAssinatura(token: string, docToken: string): Promise<ResultadoAssinatura> {
  if (!storageConfigurado()) return { situacao: "ignorado", motivo: "documentos não configurados" };
  // Não confia no corpo do aviso: consulta o documento no ZapSign.
  const doc = await detalharDocumento(token, docToken);
  if (doc.status !== "signed") return { situacao: "ignorado", motivo: "ainda não assinado por todos" };
  const pessoa = escolherCliente(doc.signers ?? []);
  if (!pessoa) return { situacao: "ignorado", motivo: "sem signatário" };

  const arquivos = arquivosAssinados(doc);
  const ja = new Set(
    (await prisma.documento.findMany({ where: { origemExterna: { in: arquivos.map((a) => a.origem) } }, select: { origemExterna: true } })).map((d) => d.origemExterna),
  );
  const faltam = arquivos.filter((a) => !ja.has(a.origem));
  if (faltam.length === 0) return { situacao: "ignorado", motivo: "já recebido" };

  const cliente = await acharOuCriarCliente(pessoa);
  let novos = 0;
  for (const a of faltam) {
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
  if (novos === 0) return { situacao: "ignorado", motivo: "nenhum arquivo novo", clienteId: cliente.id };

  const rascunho =
    (await prisma.ficha.findFirst({ where: { clienteId: cliente.id, situacao: "RASCUNHO" }, select: { id: true } })) ??
    (await prisma.ficha.create({ data: { clienteId: cliente.id, dados: { dataAtendimento: hojeSaoPaulo() } }, select: { id: true } }));

  await avisarUsuarios(
    { perfil: { in: ["DONO", "SECRETARIA"] } },
    {
      title: "Contrato assinado",
      body: `${cliente.nome}${cliente.novo ? " (cliente novo)" : ""}. Preencher a ficha.`,
      url: `/clientes/${cliente.id}/fichas/${rascunho.id}`,
      tag: "zapsign",
    },
  ).catch((err) => console.error("[zapsign] aviso", err));

  return { situacao: "pronto", clienteId: cliente.id, novos };
}
