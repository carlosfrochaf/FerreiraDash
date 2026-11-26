// Envio de documento em duas etapas: o servidor confere tudo e devolve um "ticket" assinado;
// o navegador manda o arquivo direto ao Supabase Storage; depois o servidor registra com o ticket.
// Assim o arquivo não passa pelo servidor do app (a Vercel só aceita 4,5 MB por pedido). Só no servidor.
import { createHmac, timingSafeEqual } from "node:crypto";

export type DadosEnvio = {
  id: string;
  usuarioId: string;
  clienteId: string;
  recebimentoId: string | null;
  peticaoId: string | null;
  tipo: string;
  nome: string;
  caminho: string;
  mime: string;
  tamanho: number;
};

/** O link de envio do Supabase vale 2 horas; o ticket, o mesmo. */
const VALIDADE_MS = 2 * 60 * 60 * 1000;

const assinatura = (corpo: string, segredo: string) => createHmac("sha256", segredo).update(`documento:${corpo}`).digest("base64url");

export function assinarTicket(d: DadosEnvio, segredo: string, agoraMs = Date.now()): string {
  const corpo = Buffer.from(JSON.stringify({ ...d, expira: agoraMs + VALIDADE_MS })).toString("base64url");
  return `${corpo}.${assinatura(corpo, segredo)}`;
}

/** Dados do ticket, ou null se foi alterado, venceu ou é de outro usuário. */
export function lerTicket(ticket: unknown, usuarioId: string, segredo: string, agoraMs = Date.now()): DadosEnvio | null {
  if (typeof ticket !== "string") return null;
  const [corpo, sig] = ticket.split(".");
  if (!corpo || !sig) return null;
  const esperado = Buffer.from(assinatura(corpo, segredo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const { expira, ...d } = JSON.parse(Buffer.from(corpo, "base64url").toString()) as DadosEnvio & { expira: number };
    if (!(expira > agoraMs) || d.usuarioId !== usuarioId) return null;
    return d;
  } catch {
    return null;
  }
}

/** Nome seguro para o caminho no Storage (sem acento nem símbolos). */
export function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);
}
