// Senha com PBKDF2-SHA256 (Web Crypto). Guardado: pbkdf2$<voltas>$<salHex>$<hashHex>.

const VOLTAS = 210_000;
const enc = new TextEncoder();

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const deHex = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)));

async function derivar(senha: string, sal: Uint8Array, voltas: number): Promise<string> {
  const chave = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal as BufferSource, iterations: voltas }, chave, 256);
  return hex(bits);
}

export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function hashSenha(senha: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${VOLTAS}$${hex(sal)}$${await derivar(senha, sal, VOLTAS)}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [tipo, voltas, sal, hash] = guardado.split("$");
  if (tipo !== "pbkdf2" || !Number(voltas) || !sal || !hash) return false;
  return iguais(await derivar(senha, deHex(sal), Number(voltas)), hash);
}
