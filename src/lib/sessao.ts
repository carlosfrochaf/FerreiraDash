// Cookie de sessão assinado: id.perfil.versao.expira.assinatura (HMAC-SHA256 com SESSION_SECRET).
// Só Web Crypto, para rodar no middleware (edge) e no servidor.
import { ehPerfil, type Perfil } from "./perfis";
import { iguais } from "./senha";

export const AUTH_COOKIE = "fd_sessao";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias

export type Sessao = { id: string; perfil: Perfil; versao: number; expira: number };

const enc = new TextEncoder();

async function assinar(texto: string, segredo: string): Promise<string> {
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, enc.encode(texto));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function segredoSessao(): string | undefined {
  const s = process.env.SESSION_SECRET;
  return s && s.length > 0 ? s : undefined;
}

export async function assinarSessao(s: Omit<Sessao, "expira">, segredo: string, agoraMs = Date.now()): Promise<string> {
  const corpo = `${s.id}.${s.perfil}.${s.versao}.${agoraMs + AUTH_MAX_AGE * 1000}`;
  return `${corpo}.${await assinar(corpo, segredo)}`;
}

export async function lerSessao(token: string | undefined, segredo: string, agoraMs = Date.now()): Promise<Sessao | null> {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 5) return null;
  const [id, perfil, versao, expira, sig] = partes;
  if (!id || !ehPerfil(perfil) || !Number.isInteger(Number(versao)) || !(Number(expira) > agoraMs)) return null;
  if (!iguais(sig, await assinar(partes.slice(0, 4).join("."), segredo))) return null;
  return { id, perfil, versao: Number(versao), expira: Number(expira) };
}
