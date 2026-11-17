// Intimações do Diário de Justiça Eletrônico Nacional (API de comunicações do CNJ). Puro.

/** Item como vem da API do CNJ (só o que usamos). */
export type ComunicacaoCnj = {
  id: string | number;
  data_disponibilizacao: string;
  numero_processo: string;
  numeroprocessocommascara?: string | null;
  siglaTribunal?: string | null;
  nomeOrgao?: string | null;
  nomeClasse?: string | null;
  tipoComunicacao?: string | null;
  tipoDocumento?: string | null;
  texto?: string | null;
  link?: string | null;
  hash?: string | null;
};

export type TipoIntimacao = "SENTENCA" | "ACORDAO" | "DECISAO" | "DESPACHO" | "AUDIENCIA" | "OUTRA";

export const ROTULO_TIPO: Record<TipoIntimacao, string> = {
  SENTENCA: "Sentença",
  ACORDAO: "Acórdão",
  DECISAO: "Decisão",
  DESPACHO: "Despacho",
  AUDIENCIA: "Audiência",
  OUTRA: "Intimação",
};

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** "Despacho ID 6d25a0a proferido nos autos" → { tipo: "despacho", id: "6d25a0a" }. */
function documentoCitado(texto: string): { tipo: string; id: string } | null {
  const m = /\b(senten[cç]a|ac[oó]rd[aã]o|decis[aã]o|despacho)\s+ID\s+([0-9a-f]{6,})\b/i.exec(texto);
  return m ? { tipo: sem(m[1]), id: m[2].toLowerCase() } : null;
}

export function tipoDaIntimacao(c: Pick<ComunicacaoCnj, "texto" | "tipoDocumento">): TipoIntimacao {
  const doc = documentoCitado(c.texto ?? "");
  const de = (t: string): TipoIntimacao | null =>
    t.startsWith("senten") ? "SENTENCA" : t.startsWith("acord") ? "ACORDAO" : t.startsWith("decis") ? "DECISAO" : t.startsWith("despacho") ? "DESPACHO" : null;
  if (doc) return de(doc.tipo) ?? "OUTRA";
  const porDocumento = de(sem(c.tipoDocumento ?? ""));
  if (porDocumento) return porDocumento;
  if (/audiencia/.test(sem(c.texto ?? ""))) return "AUDIENCIA";
  return "OUTRA";
}

/** FNV-1a de 32 bits, em hexadecimal: basta para separar textos diferentes do mesmo dia e processo. */
function resumoTexto(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Mesma publicação para vários advogados do processo → mesma chave. */
export function chaveIntimacao(c: ComunicacaoCnj): string {
  const base = `${digitos(c.numero_processo)}|${c.data_disponibilizacao}`;
  const texto = c.texto ?? "";
  const doc = documentoCitado(texto);
  if (doc) return `${base}|${doc.id}`;
  // O acórdão sai numa versão para cada parte intimada (textos diferentes); só há um por processo no dia.
  if (sem(c.tipoDocumento ?? "").startsWith("acord")) return `${base}|acordao`;
  return `${base}|${sem(c.tipoDocumento ?? "")}|${resumoTexto(sem(texto).replace(/\s+/g, " ").trim())}`;
}

/** Junta as cópias (mesma chave), mantendo a primeira. */
export function semRepetidas(lista: ComunicacaoCnj[]): (ComunicacaoCnj & { chave: string })[] {
  const vistas = new Map<string, ComunicacaoCnj & { chave: string }>();
  for (const c of lista) {
    const chave = chaveIntimacao(c);
    if (!vistas.has(chave)) vistas.set(chave, { ...c, chave });
  }
  return [...vistas.values()];
}

export type Vinculo = { clienteId: string | null; recebimentoId: string | null };

/** Liga pelo número do processo: primeiro a causa (Recebimentos); senão audiência/petição/cliente com esse número. */
export function vincularProcesso(
  numero: string,
  causas: { id: string; processoNumero: string | null; clienteId: string | null }[],
  outros: { processoNumero: string | null; clienteId: string | null }[],
): Vinculo {
  const n = digitos(numero);
  if (!n) return { clienteId: null, recebimentoId: null };
  const causa = causas.find((c) => digitos(c.processoNumero) === n);
  if (causa) return { clienteId: causa.clienteId, recebimentoId: causa.id };
  const outro = outros.find((o) => o.clienteId && digitos(o.processoNumero) === n);
  return { clienteId: outro?.clienteId ?? null, recebimentoId: null };
}

/** "3 intimações novas: 1 sentença, 2 despachos". */
export function resumoDoDia(tipos: TipoIntimacao[]): string {
  const plural: Record<TipoIntimacao, string> = {
    SENTENCA: "sentenças",
    ACORDAO: "acórdãos",
    DECISAO: "decisões",
    DESPACHO: "despachos",
    AUDIENCIA: "audiências",
    OUTRA: "outras",
  };
  const ordem: TipoIntimacao[] = ["SENTENCA", "ACORDAO", "DECISAO", "AUDIENCIA", "DESPACHO", "OUTRA"];
  const partes = ordem
    .map((t) => [t, tipos.filter((x) => x === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => (n === 1 ? `1 ${ROTULO_TIPO[t].toLowerCase()}` : `${n} ${plural[t]}`));
  const total = tipos.length;
  return `${total} ${total === 1 ? "intimação nova" : "intimações novas"}: ${partes.join(", ")}`;
}

/** OAB digitada → { numero, uf } ou null. Aceita "148002/MG", "MG 148.002", "148002 mg". */
export function lerOab(texto: string): { numero: string; uf: string } | null {
  const uf = /\b([A-Za-z]{2})\b/.exec(texto)?.[1]?.toUpperCase();
  const numero = digitos(texto.replace(/[A-Za-z]/g, ""));
  if (!uf || !UFS.has(uf) || numero.length < 3 || numero.length > 7) return null;
  return { numero: String(Number(numero)), uf };
}

const UFS = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
