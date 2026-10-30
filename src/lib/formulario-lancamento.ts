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

/** Categorias lançadas pelas abas Causa, Audiência e Petição: não aparecem em "Outro". */
const SLUGS_DE_OUTRA_ABA = ["AUDIENCIA", "REPASSE_CLIENTE", "ADVOGADO_COLABORADOR", "ALVARA_CAUSA_GANHA", "HONORARIOS_ESCRITORIO"];

export function usadaEmOutraAba(slug: string | null | undefined): boolean {
  return !!slug && SLUGS_DE_OUTRA_ABA.includes(slug);
}

/** Categorias da aba "Outro". Na edição, mantém a do lançamento mesmo que tenha saído da lista. */
export function categoriasDoAvulso<T extends { id: string; slug?: string | null }>(categorias: T[], categoriaAtualId?: string): T[] {
  return categorias.filter((c) => c.id === categoriaAtualId || !usadaEmOutraAba(c.slug));
}

/**
 * Mês da tela Despesas em que a saída salva vai aparecer (para abrir direto nele).
 * Segue a mesma data que o Histórico/Despesas usam: salário pelo mês de referência;
 * os demais pela data do pagamento, se houver, senão pelo vencimento.
 */
export function mesDaSaida(
  s: { slug: string | null | undefined; status: string; dataCompetencia: string; dataPagamento: string; editando: boolean },
  hoje: string
): string {
  if (s.slug === "SALARIO") return s.dataCompetencia.slice(0, 7);
  if (s.dataPagamento) return s.dataPagamento.slice(0, 7);
  // Sem data, a edição marca o pagamento como hoje; o cadastro não grava data.
  if (s.status === "PAGO" && s.editando) return hoje.slice(0, 7);
  return s.dataCompetencia.slice(0, 7);
}
