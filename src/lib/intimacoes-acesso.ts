// Quais intimações cada perfil vê. Puro.
import type { Prisma } from "@prisma/client";
import type { Perfil } from "./perfis";
import { filtroClientesDoUsuario } from "./acesso-clientes";

/** Dono e secretária: todas. Advogado: só as ligadas a clientes dele. */
export function filtroIntimacoesDoUsuario(u: { perfil: Perfil; advogadoChave: string | null }): Prisma.IntimacaoWhereInput {
  if (u.perfil === "ADVOGADO") return { cliente: filtroClientesDoUsuario(u) };
  return {};
}
