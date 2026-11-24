// Regras do cadastro de clientes. Puro.
import { cpfValido as cpfDigitosValido } from "./pix";

/** Chave para achar o mesmo cliente escrito de jeitos diferentes: sem acento, minúsculas, espaços únicos. */
export function chaveCliente(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** "529.982.247-25" → "***.982.247-**" (só mostra o miolo). */
export function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function cpfValido(cpf: string): boolean {
  return cpfDigitosValido(cpf.replace(/\D/g, ""));
}

/** Link do WhatsApp para um celular brasileiro, ou null se o número não fizer sentido. */
export function linkWhatsApp(telefone: string): string | null {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;
  return `https://wa.me/55${d}`;
}

/**
 * Junta nomes iguais (pela chave) e escolhe como o cliente vai se chamar: o mais usado;
 * no empate, o que tem acento e depois o com mais maiúsculas. Ordenado pela chave.
 */
export function agruparNomes(nomes: string[]): { chave: string; nome: string }[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const bruto of nomes) {
    const nome = bruto.trim().replace(/\s+/g, " ");
    if (!nome) continue;
    const chave = chaveCliente(nome);
    const g = grupos.get(chave) ?? new Map<string, number>();
    g.set(nome, (g.get(nome) ?? 0) + 1);
    grupos.set(chave, g);
  }
  const acentos = (t: string) => t.normalize("NFD").length - t.normalize("NFC").length;
  const maiusculas = (t: string) => (t.match(/[A-ZÀ-Ý]/g) ?? []).length;
  return [...grupos.entries()]
    .map(([chave, g]) => {
      const nome = [...g.entries()].sort(
        ([a, na], [b, nb]) => nb - na || acentos(b) - acentos(a) || maiusculas(b) - maiusculas(a) || a.localeCompare(b)
      )[0][0];
      return { chave, nome };
    })
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "THAYSSA MARIA VELOSO" → "Thayssa Maria Veloso". Nome já com minúsculas fica como está. */
export function nomeExibicao(nome: string): string {
  if (nome !== nome.toUpperCase() || !/[A-ZÀ-Ý]/.test(nome)) return nome;
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** "31996229190" → "(31) 99622-9190"; sem 10 ou 11 números, devolve como veio. */
export function telefoneExibicao(telefone: string): string {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

export function contar(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
