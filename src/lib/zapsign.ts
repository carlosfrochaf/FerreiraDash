// ZapSign: regras puras e chamadas à API. https://docs.zapsign.com.br
import { createHmac } from "node:crypto";

export const ZAPSIGN_API = "https://api.zapsign.com.br/api/v1";

export type ZapSigner = { name?: string | null; email?: string | null; phone_country?: string | null; phone_number?: string | null; cpf?: string | null };
type ZapArquivo = { token: string; name?: string | null; signed_file?: string | null };
export type ZapDocumento = ZapArquivo & { status?: string; signers?: ZapSigner[]; extra_docs?: ZapArquivo[]; created_at?: string | null };

export type TipoArquivo = "CONTRATO_HONORARIOS" | "PROCURACAO" | "DECLARACAO_HIPOSSUFICIENCIA" | "OUTRO";
export const ROTULO_ARQUIVO: Record<TipoArquivo, string> = {
  CONTRATO_HONORARIOS: "Contrato de honorários",
  PROCURACAO: "Procuração",
  DECLARACAO_HIPOSSUFICIENCIA: "Declaração de hipossuficiência",
  OUTRO: "Documento",
};
export type ArquivoAssinado = { token: string; nome: string; tipo: TipoArquivo };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Tipo do documento pelo nome que o escritório deu no ZapSign. */
export function tipoPeloNome(nome: string): TipoArquivo {
  const n = semAcento(nome);
  if (n.includes("procura")) return "PROCURACAO";
  if (n.includes("hipossufici")) return "DECLARACAO_HIPOSSUFICIENCIA";
  if (n.includes("honor") || n.includes("contrato")) return "CONTRATO_HONORARIOS";
  if (n.includes("declara")) return "DECLARACAO_HIPOSSUFICIENCIA";
  return "OUTRO";
}

/** Telefone para comparar: últimos 11 números (DDD + número), sem o 55. */
export function chaveTelefone(tel: string | null | undefined): string | null {
  const d = digitos(tel);
  return d.length >= 10 ? d.slice(-11) : null;
}

/** Só o cliente assina: é o primeiro signatário. */
export function escolherCliente(signers: ZapSigner[]): { nome: string; email: string | null; telefone: string | null; cpf: string | null } | null {
  const s = signers.find((x) => x.name?.trim());
  if (!s) return null;
  const cpf = digitos(s.cpf);
  return {
    nome: s.name!.trim().replace(/\s+/g, " "),
    email: s.email?.trim() || null,
    telefone: chaveTelefone(s.phone_number),
    cpf: cpf.length === 11 ? cpf : null,
  };
}

/** Arquivos assinados do envio (o principal e os extras). O link não é guardado: o do ZapSign vence. */
export function arquivosDoEnvio(doc: ZapDocumento): ArquivoAssinado[] {
  return [doc, ...(doc.extra_docs ?? [])]
    .filter((a) => a.signed_file)
    .map((a) => {
      const nome = (a.name?.trim() || "Documento assinado").replace(/\.pdf$/i, "");
      return { token: a.token, nome, tipo: tipoPeloNome(nome) };
    });
}

/** Link atual (temporário) de um arquivo do envio, ou null. */
export function linkDoArquivo(doc: ZapDocumento, token: string): string | null {
  return [doc, ...(doc.extra_docs ?? [])].find((a) => a.token === token)?.signed_file ?? null;
}

/** Segredo que o ZapSign manda no cabeçalho do aviso; sai do CRON_SECRET, sem chave nova. */
export function segredoDoAviso(cronSecret: string): string {
  return createHmac("sha256", cronSecret).update("zapsign-aviso-v1").digest("base64url");
}

async function chamar<T>(token: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ZAPSIGN_API}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw Object.assign(new Error(`ZapSign respondeu ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

export function detalharDocumento(token: string, docToken: string) {
  return chamar<ZapDocumento>(token, `/docs/${encodeURIComponent(docToken)}/`);
}

/** Uma página da lista de envios (mais recentes primeiro). */
export function listarDocumentos(token: string, pagina: number) {
  return chamar<{ results?: ZapDocumento[]; next?: string | null }>(token, `/docs/?page=${pagina}`);
}

/** Cadastra no ZapSign o aviso de "documento assinado" para a URL do app, com o segredo no cabeçalho. */
export function cadastrarAviso(token: string, url: string, segredo: string) {
  return chamar<unknown>(token, "/user/company/webhook/", {
    method: "POST",
    body: JSON.stringify({ url, type: "doc_signed", headers: [{ name: "X-Webhook-Secret", value: segredo }] }),
  });
}
