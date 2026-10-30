// Regras do formulário de lançamento avulso. Puro.

const SLUGS_SIMPLES = ["CUSTO_OPERACIONAL", "SALARIO"];

/** Custo operacional e salário não pedem causa, processo nem cliente. */
export function usaFormularioSimples(tipo: "ENTRADA" | "SAIDA", slug: string | null | undefined): boolean {
  return tipo === "SAIDA" && !!slug && SLUGS_SIMPLES.includes(slug);
}

export type CamposCausa = {
  processoId: string;
  contatoId: string;
  processoNumero: string;
  clienteNome: string;
  reclamada: string;
};

/**
 * Campos de causa a enviar ao salvar. No formulário simples não vai nada;
 * ao editar para Custo/Salário, vão vazios para apagar o que estava gravado.
 */
export function camposDaCausa(simples: boolean, editando: boolean, v: CamposCausa): [keyof CamposCausa, string][] {
  const chaves: (keyof CamposCausa)[] = ["processoId", "contatoId", "processoNumero", "clienteNome", "reclamada"];
  if (simples) return editando ? chaves.map((k) => [k, ""]) : [];
  return chaves.filter((k) => v[k]).map((k) => [k, v[k]]);
}
