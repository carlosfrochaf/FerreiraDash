// Link de "criar nova senha": id.versao.expira.assinatura (HMAC com SESSION_SECRET, separado do cookie).
// Não fica no banco: trocar a senha sobe a versão da sessão, então o link só funciona uma vez.
import { assinar } from "./sessao";
import { iguais } from "./senha";

export const LINK_SENHA_MINUTOS = 30;
export const INTERVALO_LINK_MS = 2 * 60_000;

const texto = (corpo: string) => `nova-senha.${corpo}`;

export async function assinarLinkSenha(u: { id: string; versao: number }, segredo: string, agoraMs = Date.now()): Promise<string> {
  const corpo = `${u.id}.${u.versao}.${agoraMs + LINK_SENHA_MINUTOS * 60_000}`;
  return `${corpo}.${await assinar(texto(corpo), segredo)}`;
}

export async function lerLinkSenha(token: string | undefined, segredo: string, agoraMs = Date.now()): Promise<{ id: string; versao: number } | null> {
  const partes = token?.split(".") ?? [];
  if (partes.length !== 4) return null;
  const [id, versao, expira, sig] = partes;
  if (!id || !Number.isInteger(Number(versao)) || !(Number(expira) > agoraMs)) return null;
  if (!iguais(sig, await assinar(texto(partes.slice(0, 3).join(".")), segredo))) return null;
  return { id, versao: Number(versao) };
}

/** No máximo um e-mail de nova senha por pessoa a cada 2 minutos. */
export function podeMandarLink(ultimo: Date | null, agora = new Date()): boolean {
  return !ultimo || agora.getTime() - ultimo.getTime() >= INTERVALO_LINK_MS;
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Assunto, texto e HTML do e-mail de nova senha. */
export function emailNovaSenha(escritorio: string, nome: string, link: string) {
  const assunto = `Criar nova senha – ${escritorio}`;
  const texto = `Olá, ${nome}!\n\nPara criar uma nova senha no app do ${escritorio}, abra o link abaixo. Ele vale por ${LINK_SENHA_MINUTOS} minutos.\n\n${link}\n\nSe não foi você que pediu, ignore este e-mail: sua senha continua a mesma.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:480px">
<p>Olá, ${escapar(nome)}!</p>
<p>Para criar uma nova senha no app do <b>${escapar(escritorio)}</b>, toque no botão abaixo. Ele vale por ${LINK_SENHA_MINUTOS} minutos.</p>
<p><a href="${escapar(link)}" style="display:inline-block;background:#0b1220;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
<p style="color:#555;font-size:13px">Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.</p>
</div>`;
  return { assunto, texto, html };
}
