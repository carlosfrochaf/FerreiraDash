// Quais clientes cada perfil enxerga e quem pode apagar documento. Puro.
import type { Prisma } from "@prisma/client";
import type { Perfil } from "./perfis";

const SEM_ADVOGADO = "\u0000sem-advogado";

/** Advogado vê os clientes em que é responsável por ficha ou tem audiência/petição no nome dele. */
export function filtroClientesDoUsuario(u: { perfil: Perfil; advogadoChave: string | null }): Prisma.ClienteWhereInput {
  if (u.perfil !== "ADVOGADO") return {};
  const chave = u.advogadoChave?.trim() || SEM_ADVOGADO;
  const igual = { equals: chave, mode: "insensitive" as const };
  return {
    OR: [
      { fichas: { some: { advogadoChave: igual } } },
      { audiencias: { some: { advogadoNome: igual } } },
      { peticoes: { some: { advogadoNome: igual } } },
    ],
  };
}

/** Dono e secretária apagam qualquer um; advogado só o que ele mesmo enviou; financeiro nenhum. */
export function podeApagarDocumento(u: { id: string; perfil: Perfil }, doc: { enviadoPorId: string | null }): boolean {
  if (u.perfil === "DONO" || u.perfil === "SECRETARIA") return true;
  return u.perfil === "ADVOGADO" && !!doc.enviadoPorId && doc.enviadoPorId === u.id;
}
