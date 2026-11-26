// Assinatura HMAC (Web Crypto) usada pelo envio de documentos. Só no servidor.
const enc = new TextEncoder();

export async function assinar(texto: string, segredo: string): Promise<string> {
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, enc.encode(texto));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SESSION_SECRET, ou o CRON_SECRET que o escritório já tem. */
export function segredoSessao(): string | undefined {
  const s = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  return s && s.length > 0 ? s : undefined;
}
