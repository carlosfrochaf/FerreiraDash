// Regras do formulário de lançamento avulso. Puro.

const SLUGS_SIMPLES = ["CUSTO_OPERACIONAL", "SALARIO"];

/** Custo operacional e salário não pedem causa, processo nem cliente. */
export function usaFormularioSimples(tipo: "ENTRADA" | "SAIDA", slug: string | null | undefined): boolean {
  return tipo === "SAIDA" && !!slug && SLUGS_SIMPLES.includes(slug);
}
