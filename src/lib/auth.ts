// Acesso por senha única (APP_PASSWORD), compartilhada pelos usuários do escritório.
// O cookie guarda um HMAC derivado da senha: trocar a senha desloga todo mundo.
// Usa só Web Crypto, para rodar tanto no middleware (edge) quanto nas rotas (Node).

export const AUTH_COOKIE = "fd_sessao";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias

const encoder = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function iguaisTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getAppPassword(): string | undefined {
  const senha = process.env.APP_PASSWORD;
  return senha && senha.length > 0 ? senha : undefined;
}

export async function gerarTokenSessao(senha: string): Promise<string> {
  return hmacHex(senha, "ferreiradash-sessao-v1");
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  const senha = getAppPassword();
  if (!senha || !token) return false;
  return iguaisTempoConstante(token, await gerarTokenSessao(senha));
}

export async function senhaCorreta(tentativa: string): Promise<boolean> {
  const senha = getAppPassword();
  if (!senha) return false;
  // Compara os HMACs, não as senhas, para o tempo não depender do conteúdo.
  const [a, b] = await Promise.all([
    hmacHex("ferreiradash-login", tentativa),
    hmacHex("ferreiradash-login", senha),
  ]);
  return iguaisTempoConstante(a, b);
}
