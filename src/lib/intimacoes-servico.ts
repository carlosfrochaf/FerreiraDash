// Busca as intimações no Diário de Justiça Eletrônico Nacional e grava as novas. Só no servidor.
import { prisma } from "./prisma";
import { dataParaDb } from "./datas";
import { ROTULO_TIPO, resumoDoDia, semRepetidas, tipoDaIntimacao, vincularProcesso, type ComunicacaoCnj, type TipoIntimacao } from "./intimacoes";

const API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const POR_PAGINA = 100;
const MAXIMO_PAGINAS = 20;
/** Quantos dias para trás cada busca olha (cobre fim de semana e um dia sem busca). */
export const DIAS_DA_BUSCA = 7;

/** OAB do escritório (Dr. Carlos Ferreira Rocha). */
export const OABS = [{ numero: "148002", uf: "MG" }];

function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function buscarDaOab(oab: { numero: string; uf: string }, de: string, ate: string): Promise<ComunicacaoCnj[]> {
  const todas: ComunicacaoCnj[] = [];
  for (let pagina = 1; pagina <= MAXIMO_PAGINAS; pagina++) {
    const q = new URLSearchParams({
      numeroOab: oab.numero,
      ufOab: oab.uf,
      dataDisponibilizacaoInicio: de,
      dataDisponibilizacaoFim: ate,
      itensPorPagina: String(POR_PAGINA),
      pagina: String(pagina),
    });
    const res = await fetch(`${API}?${q}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`CNJ respondeu ${res.status}`);
    const j = (await res.json()) as { items?: ComunicacaoCnj[]; count?: number };
    const itens = j.items ?? [];
    todas.push(...itens);
    if (itens.length < POR_PAGINA || todas.length >= (j.count ?? 0)) break;
  }
  return todas;
}

export type IntimacaoNova = { tipo: TipoIntimacao; cliente: string | null; processo: string };

export type ResultadoBusca = {
  novas: IntimacaoNova[];
  falhou: boolean;
  /** A tabela estava vazia antes: é a primeira carga (não avisa no celular). */
  primeiraCarga: boolean;
};

/** Busca os últimos dias e grava só o que ainda não existe. Seguro para repetir. */
export async function sincronizarIntimacoes(hoje: string): Promise<ResultadoBusca> {
  const de = somarDias(hoje, -DIAS_DA_BUSCA);
  const brutas: ComunicacaoCnj[] = [];
  let falhas = 0;
  for (const o of OABS) {
    try {
      brutas.push(...(await buscarDaOab(o, de, hoje)));
    } catch (e) {
      console.error("[intimacoes] busca", o.numero, o.uf, e);
      falhas++;
    }
  }
  const falhou = falhas === OABS.length;
  const primeiraCarga = (await prisma.intimacao.count()) === 0;
  const unicas = semRepetidas(brutas);
  if (unicas.length === 0) return { novas: [], falhou, primeiraCarga };

  const existentes = new Set(
    (await prisma.intimacao.findMany({ where: { chave: { in: unicas.map((u) => u.chave) } }, select: { chave: true } })).map((i) => i.chave),
  );
  const faltam = unicas.filter((u) => !existentes.has(u.chave));
  if (faltam.length === 0) return { novas: [], falhou, primeiraCarga };

  const [causas, audiencias, peticoes] = await Promise.all([
    prisma.recebimento.findMany({ where: { processoNumero: { not: null } }, select: { id: true, processoNumero: true, clienteNome: true } }),
    prisma.audiencia.findMany({ where: { processoNumero: { not: null } }, select: { processoNumero: true, clienteNome: true } }),
    prisma.peticao.findMany({ where: { processoNumero: { not: null } }, select: { processoNumero: true, clienteNome: true } }),
  ]);
  const outros = [...audiencias, ...peticoes];

  const novas: IntimacaoNova[] = [];
  for (const c of faltam) {
    const tipo = tipoDaIntimacao(c);
    const v = vincularProcesso(c.numero_processo, causas, outros);
    try {
      await prisma.intimacao.create({
        data: {
          chave: c.chave,
          comunicacaoId: String(c.id),
          numeroProcesso: c.numero_processo.replace(/\D/g, ""),
          processoMascara: c.numeroprocessocommascara ?? null,
          data: dataParaDb(c.data_disponibilizacao),
          tipo,
          tribunal: c.siglaTribunal ?? null,
          orgao: c.nomeOrgao ?? null,
          classe: c.nomeClasse ?? null,
          tipoDocumento: c.tipoDocumento ?? null,
          texto: c.texto ?? "",
          link: c.link ?? null,
          clienteNome: v.clienteNome,
          recebimentoId: v.recebimentoId,
        },
      });
      novas.push({ tipo, cliente: v.clienteNome, processo: c.numeroprocessocommascara ?? c.numero_processo });
    } catch (e) {
      // Outra busca gravou a mesma ao mesmo tempo: tudo bem.
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return { novas, falhou, primeiraCarga };
}

/** Aviso das intimações que acabaram de chegar, ou null quando não há nada novo (ou é a primeira carga). */
export function avisoDasIntimacoes(r: ResultadoBusca) {
  if (r.novas.length === 0 || r.primeiraCarga) return null;
  // Tag única: um aviso novo não substitui o anterior ainda não visto.
  const tag = `intimacoes-${Date.now()}`;
  if (r.novas.length === 1) {
    const [i] = r.novas;
    return { title: `⚖️ ${ROTULO_TIPO[i.tipo]}`, body: [i.cliente, i.processo].filter(Boolean).join(" · "), url: "/intimacoes", tag };
  }
  return { title: "⚖️ Intimações", body: resumoDoDia(r.novas.map((i) => i.tipo)), url: "/intimacoes", tag };
}
