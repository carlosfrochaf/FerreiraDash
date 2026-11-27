// Lembrete da manhã: ficha em rascunho há 3 dias ou mais.
import type { Notificacao } from "./notificacoes";

export const DIAS_FICHA_PARADA = 3;

export type FichaParada = { fichaId: string; clienteId: string; nome: string };

/** Ficha criada antes deste instante está parada (meia-noite de São Paulo, 3 dias antes de hoje). */
export function limiteFichaParada(hoje: string): Date {
  const d = new Date(`${hoje}T03:00:00.000Z`); // 00h em São Paulo (UTC-3)
  d.setUTCDate(d.getUTCDate() - DIAS_FICHA_PARADA);
  return d;
}

export function avisoFichasParadas(fichas: FichaParada[]): Notificacao | null {
  if (fichas.length === 0) return null;
  if (fichas.length === 1) {
    const f = fichas[0];
    return {
      title: `📋 Ficha parada há ${DIAS_FICHA_PARADA} dias ou mais`,
      body: `${f.nome}. Preencher a ficha.`,
      url: `/clientes/${f.clienteId}/fichas/${f.fichaId}`,
      tag: "fichas-paradas",
    };
  }
  const nomes = fichas.slice(0, 4).map((f) => f.nome).join(", ");
  const resto = fichas.length > 4 ? ` e mais ${fichas.length - 4}` : "";
  return {
    title: `📋 ${fichas.length} fichas paradas há ${DIAS_FICHA_PARADA} dias ou mais`,
    body: `${nomes}${resto}.`,
    url: "/clientes",
    tag: "fichas-paradas",
  };
}
