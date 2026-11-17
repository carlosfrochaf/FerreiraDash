// Busca as intimações no Diário de Justiça Eletrônico Nacional, grava as novas e avisa. Só no servidor.
import { prisma } from "./prisma";
import { dataParaDb } from "./datas";
import { avisarAdvogado, avisarUsuarios } from "./fichas-servico";
import { resumoDoDia, semRepetidas, tipoDaIntimacao, vincularProcesso, ROTULO_TIPO, type ComunicacaoCnj, type TipoIntimacao } from "./intimacoes";

const API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const POR_PAGINA = 100;
const MAXIMO_PAGINAS = 20;
/** Quantos dias para trás cada busca olha (cobre fim de semana e um dia sem busca). */
export const DIAS_DA_BUSCA = 7;

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

export type IntimacaoNova = { id: string; tipo: TipoIntimacao; clienteId: string | null; processo: string };

export type ResultadoBusca = { oabs: number; novas: IntimacaoNova[]; falhas: string[] };

/** Busca os últimos dias de cada OAB e grava só o que ainda não existe. Seguro para repetir. */
export async function sincronizarIntimacoes(hoje: string): Promise<ResultadoBusca> {
  const oabs = await prisma.oabAcompanhada.findMany({ orderBy: { createdAt: "asc" } });
  if (oabs.length === 0) return { oabs: 0, novas: [], falhas: [] };
  const de = somarDias(hoje, -DIAS_DA_BUSCA);
  const falhas: string[] = [];
  const brutas: ComunicacaoCnj[] = [];
  for (const o of oabs) {
    try {
      brutas.push(...(await buscarDaOab(o, de, hoje)));
    } catch (e) {
      console.error("[intimacoes] busca", o.numero, o.uf, e);
      falhas.push(`${o.numero}/${o.uf}`);
    }
  }
  const unicas = semRepetidas(brutas);
  if (unicas.length === 0) return { oabs: oabs.length, novas: [], falhas };

  const existentes = new Set(
    (await prisma.intimacao.findMany({ where: { chave: { in: unicas.map((u) => u.chave) } }, select: { chave: true } })).map((i) => i.chave),
  );
  const faltam = unicas.filter((u) => !existentes.has(u.chave));
  if (faltam.length === 0) return { oabs: oabs.length, novas: [], falhas };

  const [causas, audiencias, peticoes] = await Promise.all([
    prisma.recebimento.findMany({ where: { processoNumero: { not: null } }, select: { id: true, processoNumero: true, clienteId: true } }),
    prisma.audiencia.findMany({ where: { processoNumero: { not: null }, clienteId: { not: null } }, select: { processoNumero: true, clienteId: true } }),
    prisma.peticao.findMany({ where: { processoNumero: { not: null }, clienteId: { not: null } }, select: { processoNumero: true, clienteId: true } }),
  ]);
  const outros = [...audiencias, ...peticoes];

  const novas: IntimacaoNova[] = [];
  for (const c of faltam) {
    const tipo = tipoDaIntimacao(c);
    const v = vincularProcesso(c.numero_processo, causas, outros);
    try {
      const criada = await prisma.intimacao.create({
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
          clienteId: v.clienteId,
          recebimentoId: v.recebimentoId,
        },
        select: { id: true },
      });
      novas.push({ id: criada.id, tipo, clienteId: v.clienteId, processo: c.numeroprocessocommascara ?? c.numero_processo });
    } catch (e) {
      // Outra busca gravou a mesma ao mesmo tempo: tudo bem.
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return { oabs: oabs.length, novas, falhas };
}

/** Advogado responsável por cada cliente: o da ficha mais recente; senão o da petição mais recente. */
async function advogadosDosClientes(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const [fichas, peticoes] = await Promise.all([
    prisma.ficha.findMany({ where: { clienteId: { in: ids }, advogadoChave: { not: null } }, select: { clienteId: true, advogadoChave: true }, orderBy: { updatedAt: "desc" } }),
    prisma.peticao.findMany({ where: { clienteId: { in: ids } }, select: { clienteId: true, advogadoNome: true }, orderBy: { createdAt: "desc" } }),
  ]);
  for (const f of fichas) if (!out.has(f.clienteId)) out.set(f.clienteId, f.advogadoChave!);
  for (const p of peticoes) if (p.clienteId && !out.has(p.clienteId)) out.set(p.clienteId, p.advogadoNome);
  return out;
}

/** Resumo para dono e secretária; o advogado recebe as dos clientes dele. */
export async function avisarIntimacoesNovas(novas: IntimacaoNova[]): Promise<number> {
  if (novas.length === 0) return 0;
  let n = await avisarUsuarios(
    { perfil: { in: ["DONO", "SECRETARIA"] } },
    { title: "Intimações", body: resumoDoDia(novas.map((i) => i.tipo)), url: "/intimacoes", tag: "intimacoes" },
  );
  const comCliente = novas.filter((i) => i.clienteId);
  const advogados = await advogadosDosClientes([...new Set(comCliente.map((i) => i.clienteId!))]);
  const porAdvogado = new Map<string, IntimacaoNova[]>();
  for (const i of comCliente) {
    const a = advogados.get(i.clienteId!);
    if (a) porAdvogado.set(a, [...(porAdvogado.get(a) ?? []), i]);
  }
  for (const [chave, lista] of porAdvogado) {
    n += await avisarAdvogado(chave, {
      title: lista.length === 1 ? `${ROTULO_TIPO[lista[0].tipo]} em processo seu` : "Intimações nos seus processos",
      body: resumoDoDia(lista.map((i) => i.tipo)),
      url: "/intimacoes",
      tag: "intimacoes",
    });
  }
  return n;
}
