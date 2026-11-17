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

export type Vinculo = { clienteNome: string | null; recebimentoId: string | null };

/** Liga pelo número do processo: primeiro a causa (Recebimentos); senão audiência/petição com esse número. */
export function vincularProcesso(
  numero: string,
  causas: { id: string; processoNumero: string | null; clienteNome: string | null }[],
  outros: { processoNumero: string | null; clienteNome: string | null }[],
): Vinculo {
  const n = digitos(numero);
  if (!n) return { clienteNome: null, recebimentoId: null };
  const causa = causas.find((c) => digitos(c.processoNumero) === n);
  if (causa) return { clienteNome: causa.clienteNome, recebimentoId: causa.id };
  const outro = outros.find((o) => o.clienteNome && digitos(o.processoNumero) === n);
  return { clienteNome: outro?.clienteNome ?? null, recebimentoId: null };
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

// Partes como aparecem no cabeçalho do texto: "AUTOR: FULANO RÉU: EMPRESA LTDA INTIMAÇÃO ...".
const ATIVO = ["AUTOR", "AUTORA", "RECLAMANTE", "EXEQUENTE", "REQUERENTE", "IMPETRANTE"];
const AMBIGUO = ["RECORRENTE", "RECORRIDO", "RECORRIDA", "AGRAVANTE", "AGRAVADO", "AGRAVADA", "EMBARGANTE", "EMBARGADO", "EMBARGADA"];
const PASSIVO = ["RÉU", "REU", "RÉ", "RECLAMADO", "RECLAMADA", "EXECUTADO", "EXECUTADA", "REQUERIDO", "REQUERIDA", "IMPETRADO"];
const ROTULO = new RegExp(String.raw`(?:^|\s)(${[...ATIVO, ...AMBIGUO, ...PASSIVO].join("|")})(?:\(A\))?\s*:\s*`, "g");
const FIM = /\s(?:INTIMA[ÇC][ÃA]O|Fica\s|PODER\s|DESPACHO|SENTEN[ÇC]A|DECIS[ÃA]O|EDITAL|NOTIFICA[ÇC][ÃA]O|CERTID[ÃA]O|Relator)/;
const EMPRESA =
  /\b(LTDA|S\.?\s?A\.?|S\/A|EIRELI|EPP|MEI|CIA|COMPANHIA|COM[EÉ]RCIO|SERVI[ÇC]OS|IND[ÚU]STRIA|ASSOCIA[ÇC][ÃA]O|MUNIC[ÍI]PIO|ESTADO|UNI[ÃA]O|BANCO|CONDOM[ÍI]NIO|COOPERATIVA|INSTITUTO|FUNDA[ÇC][ÃA]O|EMPRESA|HOSPITAL|LOCA[ÇC][ÃA]O|TRANSPORTES?|INCORPORA[ÇC]|CONSTRU)\b/;
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

function nomeBonito(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** Nome do cliente pelo cabeçalho do texto: a parte autora (ou, em recurso, a pessoa e não a empresa). */
export function clienteDoTexto(texto: string | null | undefined): string | null {
  const t = (texto ?? "").replace(/\s+/g, " ").slice(0, 1500);
  const achados = [...t.matchAll(ROTULO)];
  const partes: { lado: number; nome: string }[] = [];
  for (const [i, m] of achados.entries()) {
    const ini = m.index! + m[0].length;
    const fimRotulo = achados[i + 1]?.index ?? t.length;
    let bruto = t.slice(ini, fimRotulo);
    const corte = FIM.exec(bruto);
    if (corte) bruto = bruto.slice(0, corte.index);
    // O nome vem todo em maiúsculas: para na primeira palavra com minúscula ("Ficam as partes...").
    const palavras = bruto.trim().split(" ");
    const fimNome = palavras.findIndex((p) => p !== p.toUpperCase());
    const nome = (fimNome === -1 ? palavras : palavras.slice(0, fimNome))
      .join(" ")
      .replace(/\s+E OUTROS\s*\(\d+\).*$/i, "")
      .replace(/^[\d.\-/\s]+/, "")
      .trim()
      .slice(0, 120);
    if (!nome) continue;
    const rotulo = m[1].toUpperCase();
    const lado = ATIVO.includes(rotulo) ? 0 : AMBIGUO.includes(rotulo) ? 1 : 2;
    partes.push({ lado, nome });
  }
  const pessoa = partes.sort((a, b) => a.lado - b.lado).find((p) => !EMPRESA.test(p.nome.toUpperCase()));
  return pessoa ? nomeBonito(pessoa.nome) : null;
}
