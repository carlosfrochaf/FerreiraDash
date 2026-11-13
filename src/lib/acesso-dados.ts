// O que cada perfil enxerga nos dados de audiências e petições. Puro.
import { veValores, type Perfil } from "./perfis";

type Quem = { perfil: Perfil; advogadoChave: string | null };

/** Filtro do Prisma para audiências/petições: advogado só vê as dele (pelo nome, sem diferenciar maiúsculas). */
export function filtroDoUsuario(u: Quem): { advogadoNome?: { equals: string; mode: "insensitive" } } {
  if (u.perfil !== "ADVOGADO") return {};
  // Advogado sem ligação não vê nada (nome impossível).
  return { advogadoNome: { equals: u.advogadoChave ?? "\u0000sem-advogado", mode: "insensitive" } };
}

/** Tira valores em dinheiro e o Pix para quem não pode vê-los. */
export function semValores<T extends { valor?: unknown; advogadoPix?: unknown }>(item: T, perfil: Perfil): T {
  return veValores(perfil) ? item : { ...item, valor: null, advogadoPix: null };
}

/** Cadastro/edição feitos por quem não vê valores: ignora valor, pagamento e Pix enviados. */
export function entradaSemValores<T extends Record<string, unknown>>(input: T): Omit<T, "valor" | "pago" | "dataPagamento" | "advogadoPix"> {
  const { valor: _v, pago: _p, dataPagamento: _d, advogadoPix: _x, ...resto } = input;
  void _v; void _p; void _d; void _x;
  return resto;
}
