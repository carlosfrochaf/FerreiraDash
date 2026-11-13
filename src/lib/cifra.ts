// Guarda segredos (ex.: token de integração) cifrados no banco. Só no servidor.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function chave(segredo: string): Buffer {
  return createHash("sha256").update(`ferreiradash:integracoes:${segredo}`).digest();
}

/** Cifra com AES-256-GCM. Saída: iv.tag.dados (base64url). */
export function fechar(texto: string, segredo: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(segredo), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}

/** Decifra; lança erro se a chave for outra ou o texto foi mexido. */
export function abrir(cifrado: string, segredo: string): string {
  const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", chave(segredo), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}
