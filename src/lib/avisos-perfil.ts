// Quais avisos do dia cada perfil recebe. Puro.
import { chaveAdvogado } from "./advogado-chave";
import type { DadosDoDia, Notificacao } from "./notificacoes";
import type { Perfil } from "./perfis";

export const TAGS_DO_PERFIL: Record<Perfil, string[] | "todas"> = {
  DONO: "todas",
  FINANCEIRO: ["vencem-hoje", "repasses", "peticoes", "lancamentos-hoje", "advogados-semana", "pagamentos-amanha", "atrasadas"],
  SECRETARIA: ["audiencias-hoje", "audiencias-amanha", "peticoes"],
  ADVOGADO: ["audiencias-hoje", "audiencias-amanha"],
};

export function avisosDoPerfil(perfil: Perfil, notificacoes: Notificacao[]): Notificacao[] {
  const tags = TAGS_DO_PERFIL[perfil];
  return tags === "todas" ? notificacoes : notificacoes.filter((n) => !!n.tag && tags.includes(n.tag));
}

/** Dados do dia vistos por um advogado: só as audiências dele; nada de dinheiro do escritório. */
export function dadosDoAdvogado(d: DadosDoDia, chave: string): DadosDoDia {
  const dele = <T extends { advogadoNome: string }>(l?: T[]) => (l ?? []).filter((a) => chaveAdvogado(a.advogadoNome) === chave);
  return {
    vencemHoje: [],
    atrasadas: [],
    repassesProntos: [],
    lancamentosHoje: [],
    audienciasHoje: dele(d.audienciasHoje),
    audienciasAmanha: dele(d.audienciasAmanha),
  };
}
