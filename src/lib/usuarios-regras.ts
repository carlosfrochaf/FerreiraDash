// Regras puras dos usuários (sem banco), para testar e usar no navegador.
import type { Perfil } from "./perfis";

export function normalizarEmail(e: string): string {
  return e.trim().toLowerCase();
}

/** Erro se a mudança deixar o escritório sem nenhum Dono/Sócio ativo; null se puder. */
export function mudancaPermitida(
  usuarios: { id: string; perfil: Perfil; ativo: boolean }[],
  alvoId: string,
  mudanca: { perfil?: Perfil; ativo?: boolean }
): string | null {
  const depois = usuarios.map((u) => (u.id === alvoId ? { ...u, ...mudanca } : u));
  return depois.some((u) => u.perfil === "DONO" && u.ativo) ? null : "Precisa ficar pelo menos um Dono/Sócio ativo.";
}
