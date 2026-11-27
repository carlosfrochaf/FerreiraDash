// Audiência marcada lida do texto da intimação (PJe/DJEN): data, hora, tipo e link da sala.

import type { Notificacao } from "./notificacoes";

export type AudienciaLida = { data: string; hora: string; tipo: string | null; link: string | null };

/** Advogado da audiência lançada pela intimação, até alguém escolher. */
export const ADVOGADO_A_DEFINIR = "A definir";

export type AudienciaLancada = { id: string; data: string; hora: string; cliente: string | null };

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function avisoDasAudiencias(lista: AudienciaLancada[]): Notificacao | null {
  if (lista.length === 0) return null;
  const tag = `audiencias-${Date.now()}`;
  if (lista.length === 1) {
    const [a] = lista;
    return {
      title: `📅 Audiência marcada: ${diaMes(a.data)}, ${a.hora}`,
      body: `${a.cliente ?? "Cliente a conferir"}. Escolher o advogado.`,
      url: `/audiencias/${a.id}/editar`,
      tag,
    };
  }
  return {
    title: `📅 ${lista.length} audiências marcadas`,
    body: `${lista.map((a) => `${diaMes(a.data)} ${a.cliente ?? ""}`.trim()).join(", ")}. Escolher os advogados.`,
    url: "/audiencias",
    tag,
  };
}

const TIPOS: [RegExp, string][] = [
  [/\binicial\b/i, "Inicial"],
  [/\buna\b/i, "Una"],
  [/\binstru[çc][ãa]o\b/i, "Instrução"],
  [/\bconcilia(?:[çc][ãa]o|t[óo]ria)\b/i, "Conciliação"],
  [/\bencerramento\b/i, "Encerramento"],
  [/\bjulgamento\b/i, "Julgamento"],
];

function dataValida(d: number, m: number, a: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Primeira audiência futura (depois da data da publicação) citada no texto, com hora.
 * Ignora audiência "realizada"/"ocorrida" e datas sem hora (prazos).
 */
export function lerAudiencia(texto: string | null | undefined, publicada: string): AudienciaLida | null {
  const t = (texto ?? "").replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ");
  for (const m of t.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)) {
    const ini = m.index!;
    const fim = ini + m[0].length;
    const data = dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!data || data <= publicada) continue;

    const h = /^\s*(?:,\s*)?(?:(?:à|a)s\s*|-\s*)?(\d{1,2})\s*(?::|h)\s*(\d{2})?/i.exec(t.slice(fim, fim + 25));
    if (!h || Number(h[1]) > 23 || Number(h[2] ?? 0) > 59) continue;
    const hora = `${h[1].padStart(2, "0")}:${h[2] ?? "00"}`;

    const antes = t.slice(Math.max(0, ini - 300), ini);
    const pos = [...antes.matchAll(/audi[êe]ncia/gi)].pop()?.index;
    if (pos === undefined) continue;
    const entre = antes.slice(pos);
    if (/realizad|ocorrid|ocorreu|aconteceu/i.test(entre)) continue;

    const tipo = TIPOS.find(([re]) => re.test(entre))?.[1] ?? null;
    const url = /https?:\/\/[^\s<>"]+/.exec(t.slice(fim, fim + 300))?.[0].replace(/[.,;)]+$/, "") ?? null;
    return { data, hora, tipo, link: url };
  }
  return null;
}
