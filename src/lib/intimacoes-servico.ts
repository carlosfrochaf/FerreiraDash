// Busca as intimações no Diário de Justiça Eletrônico Nacional e grava as novas. Só no servidor.
import { prisma } from "./prisma";
import { dataDoDb, dataParaDb } from "./datas";
import { ROTULO_TIPO, clienteDoTexto, reclamadaDoTexto, resumoDoDia, semRepetidas, tipoDaIntimacao, vincularProcesso, type ComunicacaoCnj, type TipoIntimacao } from "./intimacoes";
import { ADVOGADO_A_DEFINIR, lerAudiencia, ultimaPorProcesso, type AudienciaLancada } from "./audiencia-intimacao";
import { garantirCliente } from "./clientes-servico";

const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

type IntimacaoParaAudiencia = { numeroProcesso: string; processoMascara: string | null; data: Date; texto: string; clienteNome: string | null };

/**
 * Lança a audiência marcada na intimação (advogado "A definir"). Não repete: mesmo processo e mesma data já lançados
 * ficam como estão. Com `simular`, só diz o que lançaria.
 */
export async function lancarAudienciaDaIntimacao(i: IntimacaoParaAudiencia, simular = false): Promise<AudienciaLancada | null> {
  const lida = lerAudiencia(i.texto, dataDoDb(i.data));
  if (!lida) return null;
  const numero = soDigitos(i.numeroProcesso);
  const mesmoDia = await prisma.audiencia.findMany({ where: { data: dataParaDb(lida.data) }, select: { processoNumero: true } });
  if (numero && mesmoDia.some((a) => soDigitos(a.processoNumero) === numero)) return null;

  const cliente = i.clienteNome?.trim() || null;
  if (simular) return { id: "", data: lida.data, hora: lida.hora, cliente };
  const obs = [
    `Lançada pela intimação de ${dataDoDb(i.data).split("-").reverse().join("/")}.`,
    lida.tipo && `Audiência ${lida.tipo.toLowerCase()}.`,
    lida.link && `Sala: ${lida.link}`,
  ]
    .filter(Boolean)
    .join(" ");
  const nova = await prisma.audiencia.create({
    data: {
      data: dataParaDb(lida.data),
      hora: lida.hora,
      advogadoNome: ADVOGADO_A_DEFINIR,
      clienteNome: cliente ?? "A conferir",
      reclamada: reclamadaDoTexto(i.texto),
      processoNumero: i.processoMascara ?? i.numeroProcesso,
      observacoes: obs,
      clienteId: cliente ? await garantirCliente(prisma, cliente) : null,
    },
    select: { id: true },
  });
  return { id: nova.id, data: lida.data, hora: lida.hora, cliente };
}

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

/**
 * Audiências marcadas em publicações antigas (últimos `meses`), que ainda vão acontecer. Busca de 30 em 30 dias;
 * de cada processo vale a publicação mais recente; processo que já tem audiência futura fica como está.
 * Não grava as intimações antigas. Com `simular`, só diz o que lançaria.
 */
export async function audienciasDoPassado(hoje: string, meses: number, simular: boolean) {
  const brutas: ComunicacaoCnj[] = [];
  for (let fim = hoje, i = 0; i < meses; i++) {
    const ini = somarDias(fim, -29);
    for (const o of OABS) brutas.push(...(await buscarDaOab(o, ini, fim)));
    fim = somarDias(ini, -1);
  }
  const candidatas = ultimaPorProcesso(
    semRepetidas(brutas)
      .map((c) => ({ c, processo: soDigitos(c.numero_processo), publicada: c.data_disponibilizacao, lida: lerAudiencia(c.texto, c.data_disponibilizacao) }))
      .filter((x) => x.lida && x.lida.data > hoje),
  );
  const futuras = await prisma.audiencia.findMany({ where: { data: { gte: dataParaDb(hoje) } }, select: { processoNumero: true } });
  const comFutura = new Set(futuras.map((a) => soDigitos(a.processoNumero)));
  const { causas, outros } = await carregarProcessos();

  const lancadas = [];
  for (const { c, processo } of candidatas) {
    if (comFutura.has(processo)) continue;
    const clienteNome = vincularProcesso(c.numero_processo, causas, outros).clienteNome ?? clienteDoTexto(c.texto);
    const a = await lancarAudienciaDaIntimacao(
      { numeroProcesso: c.numero_processo, processoMascara: c.numeroprocessocommascara ?? null, data: dataParaDb(c.data_disponibilizacao), texto: c.texto ?? "", clienteNome },
      simular,
    );
    if (a) lancadas.push({ ...a, processo: c.numeroprocessocommascara ?? c.numero_processo, publicada: c.data_disponibilizacao });
  }
  return { publicacoes: brutas.length, lancadas };
}

async function carregarProcessos() {
  const [causas, audiencias, peticoes] = await Promise.all([
    prisma.recebimento.findMany({ where: { processoNumero: { not: null } }, select: { id: true, processoNumero: true, clienteNome: true } }),
    prisma.audiencia.findMany({ where: { processoNumero: { not: null } }, select: { processoNumero: true, clienteNome: true } }),
    prisma.peticao.findMany({ where: { processoNumero: { not: null } }, select: { processoNumero: true, clienteNome: true } }),
  ]);
  return { causas, outros: [...audiencias, ...peticoes] };
}

/** Intimações já gravadas sem cliente: tenta de novo pelo app (causa cadastrada depois) e pelo texto. */
async function completarClientes() {
  const sem = await prisma.intimacao.findMany({ where: { clienteNome: null }, select: { id: true, numeroProcesso: true, texto: true }, take: 300 });
  if (sem.length === 0) return;
  const { causas, outros } = await carregarProcessos();
  for (const i of sem) {
    const v = vincularProcesso(i.numeroProcesso, causas, outros);
    const clienteNome = v.clienteNome ?? clienteDoTexto(i.texto);
    if (clienteNome) await prisma.intimacao.update({ where: { id: i.id }, data: { clienteNome, recebimentoId: v.recebimentoId ?? undefined } });
  }
}

export type IntimacaoNova = { tipo: TipoIntimacao; cliente: string | null; processo: string };

export type ResultadoBusca = {
  novas: IntimacaoNova[];
  falhou: boolean;
  /** A tabela estava vazia antes: é a primeira carga (não avisa no celular). */
  primeiraCarga: boolean;
  /** Audiências lançadas a partir das intimações novas. */
  audiencias?: AudienciaLancada[];
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
  await completarClientes().catch((e) => console.error("[intimacoes] completar clientes", e));
  const primeiraCarga = (await prisma.intimacao.count()) === 0;
  const unicas = semRepetidas(brutas);
  if (unicas.length === 0) return { novas: [], falhou, primeiraCarga };

  const existentes = new Set(
    (await prisma.intimacao.findMany({ where: { chave: { in: unicas.map((u) => u.chave) } }, select: { chave: true } })).map((i) => i.chave),
  );
  const faltam = unicas.filter((u) => !existentes.has(u.chave));
  if (faltam.length === 0) return { novas: [], falhou, primeiraCarga };

  const { causas, outros } = await carregarProcessos();

  const novas: IntimacaoNova[] = [];
  const audiencias: AudienciaLancada[] = [];
  for (const c of faltam) {
    const tipo = tipoDaIntimacao(c);
    const v = vincularProcesso(c.numero_processo, causas, outros);
    // Processo que não está no app: o nome sai do próprio texto (parte autora).
    const clienteNome = v.clienteNome ?? clienteDoTexto(c.texto);
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
          clienteNome,
          recebimentoId: v.recebimentoId,
        },
      });
      novas.push({ tipo, cliente: clienteNome, processo: c.numeroprocessocommascara ?? c.numero_processo });
    } catch (e) {
      // Outra busca gravou a mesma ao mesmo tempo: tudo bem.
      if ((e as { code?: string }).code !== "P2002") throw e;
      continue;
    }
    try {
      const a = await lancarAudienciaDaIntimacao({
        numeroProcesso: c.numero_processo,
        processoMascara: c.numeroprocessocommascara ?? null,
        data: dataParaDb(c.data_disponibilizacao),
        texto: c.texto ?? "",
        clienteNome,
      });
      if (a) audiencias.push(a);
    } catch (e) {
      console.error("[intimacoes] audiência", c.chave, e);
    }
  }
  return { novas, falhou, primeiraCarga, audiencias };
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
