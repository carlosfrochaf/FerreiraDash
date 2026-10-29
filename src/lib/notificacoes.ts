// Monta as notificações push do dia a partir das parcelas e lançamentos.
// Puro (não acessa banco nem rede), para poder ser testado.

export type Turno = "manha" | "noite";

export interface ParcelaAviso {
  numero: number;
  totalParcelas: number;
  vencimento: string; // AAAA-MM-DD
  valorParcela: number;
  valorEscritorio: number;
  valorCliente: number;
  clienteNome: string;
  reclamada: string | null;
  processoNumero: string | null;
}

export interface LancamentoAviso {
  descricao: string;
  valor: number;
  tipo: "ENTRADA" | "SAIDA";
}

export interface AudienciaAviso {
  hora: string | null;
  clienteNome: string;
  reclamada: string | null;
  advogadoNome: string;
  processoNumero: string | null;
}

export interface DadosDoDia {
  /** Parcelas que vencem hoje e ainda não foram recebidas. */
  vencemHoje: ParcelaAviso[];
  /** Parcelas vencidas antes de hoje e ainda não recebidas. */
  atrasadas: ParcelaAviso[];
  /** Parcelas recebidas e ainda não repassadas ao cliente. */
  repassesProntos: ParcelaAviso[];
  /** Lançamentos avulsos pendentes com data de hoje. */
  lancamentosHoje: LancamentoAviso[];
  /** Audiências de hoje (aviso das 8h) e de amanhã (lembrete das 19h). */
  audienciasHoje?: AudienciaAviso[];
  audienciasAmanha?: AudienciaAviso[];
  /** Petições pendentes (resumo das 8h). */
  peticoesAValidar?: number;
  peticoesAPagar?: { quantidade: number; total: number };
}

export interface Notificacao {
  title: string;
  body: string;
  url: string;
  /** Mesma tag substitui a notificação anterior no aparelho em vez de empilhar. */
  tag: string;
}

const MAX_LINHAS = 4;

export function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function soma(lista: ParcelaAviso[], campo: "valorParcela" | "valorEscritorio" | "valorCliente") {
  return lista.reduce((s, p) => s + p[campo], 0);
}

function empresa(p: ParcelaAviso) {
  return p.reclamada || "Empresa não informada";
}

/** Linha compacta: "Empresa X · Cliente: Maria · 2/5 · R$ 2.500,00 (escritório R$ 750,00)" */
function linhaParcela(p: ParcelaAviso) {
  return `${empresa(p)} · Cliente: ${p.clienteNome} · ${p.numero}/${p.totalParcelas} · ${brl(p.valorParcela)} (escritório ${brl(p.valorEscritorio)})`;
}

function listar<T>(itens: T[], linha: (t: T) => string) {
  const linhas = itens.slice(0, MAX_LINHAS).map(linha);
  if (itens.length > MAX_LINHAS) linhas.push(`e mais ${itens.length - MAX_LINHAS}`);
  return linhas.join("\n");
}

function linhaAudiencia(a: AudienciaAviso) {
  return `${a.hora ? `${a.hora} · ` : ""}${a.clienteNome}${a.reclamada ? ` × ${a.reclamada}` : ""} · Adv. ${a.advogadoNome}`;
}

function avisoAudiencias(lista: AudienciaAviso[], quando: "hoje" | "amanhã", tag: string): Notificacao | null {
  if (lista.length === 0) return null;
  if (lista.length === 1) {
    const a = lista[0];
    return {
      title: `Audiência ${quando}${a.hora ? ` às ${a.hora}` : ""}: ${a.clienteNome}`,
      body: [a.reclamada ? `Empresa: ${a.reclamada}` : "", `Advogado: ${a.advogadoNome}`, a.processoNumero ? `Proc. ${a.processoNumero}` : ""]
        .filter(Boolean)
        .join("\n"),
      url: "/audiencias",
      tag,
    };
  }
  return { title: `${lista.length} audiências ${quando}`, body: listar(lista, linhaAudiencia), url: "/audiencias", tag };
}

function plural(n: number, um: string, varios: string) {
  return n === 1 ? um : varios;
}

/**
 * Manhã (8h): audiências de hoje + o que vence hoje + repasses prontos + lançamentos do dia.
 * Noite (19h): audiências de amanhã + o que venceu hoje e não foi marcado + atrasadas.
 * Várias parcelas viram uma notificação só, para não gerar spam.
 */
export function montarNotificacoes(turno: Turno, d: DadosDoDia): Notificacao[] {
  const out: Notificacao[] = [];

  if (turno === "manha") {
    const aud = avisoAudiencias(d.audienciasHoje ?? [], "hoje", "audiencias-hoje");
    if (aud) out.push(aud);

    if (d.vencemHoje.length === 1) {
      const p = d.vencemHoje[0];
      out.push({
        title: `Hoje tem pagamento: ${empresa(p)}`,
        body: [
          `Cliente: ${p.clienteNome} · parcela ${p.numero}/${p.totalParcelas}`,
          `${brl(p.valorParcela)} (seu escritório: ${brl(p.valorEscritorio)})`,
          p.processoNumero ? `Proc. ${p.processoNumero}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        url: "/recebimentos",
        tag: "vencem-hoje",
      });
    } else if (d.vencemHoje.length > 1) {
      out.push({
        title: `${d.vencemHoje.length} pagamentos hoje · ${brl(soma(d.vencemHoje, "valorParcela"))}`,
        body: listar(d.vencemHoje, linhaParcela),
        url: "/recebimentos",
        tag: "vencem-hoje",
      });
    }

    if (d.repassesProntos.length > 0) {
      const n = d.repassesProntos.length;
      out.push({
        title: `${n} ${plural(n, "repasse a fazer", "repasses a fazer")} · ${brl(soma(d.repassesProntos, "valorCliente"))}`,
        body: listar(d.repassesProntos, (p) => `Cliente: ${p.clienteNome} · ${brl(p.valorCliente)} (${empresa(p)}, ${p.numero}/${p.totalParcelas})`),
        url: "/recebimentos",
        tag: "repasses",
      });
    }

    const aValidar = d.peticoesAValidar ?? 0;
    const aPagar = d.peticoesAPagar ?? { quantidade: 0, total: 0 };
    if (aValidar > 0 || aPagar.quantidade > 0) {
      const partes = [
        aValidar > 0 ? `${aValidar} ${plural(aValidar, "petição a validar", "petições a validar")}` : "",
        aPagar.quantidade > 0 ? `${aPagar.quantidade} a pagar (${brl(aPagar.total)})` : "",
      ].filter(Boolean);
      out.push({ title: "Petições dos advogados", body: partes.join(" · "), url: "/peticoes", tag: "peticoes" });
    }

    if (d.lancamentosHoje.length > 0) {
      const n = d.lancamentosHoje.length;
      out.push({
        title: `${n} ${plural(n, "lançamento vence hoje", "lançamentos vencem hoje")}`,
        body: listar(d.lancamentosHoje, (l) => `${l.tipo === "ENTRADA" ? "Receber" : "Pagar"}: ${l.descricao} · ${brl(l.valor)}`),
        url: "/historico",
        tag: "lancamentos-hoje",
      });
    }
  } else {
    const aud = avisoAudiencias(d.audienciasAmanha ?? [], "amanhã", "audiencias-amanha");
    if (aud) out.push(aud);

    if (d.vencemHoje.length > 0) {
      const n = d.vencemHoje.length;
      out.push({
        title: `${n} ${plural(n, "pagamento de hoje ainda não confirmado", "pagamentos de hoje ainda não confirmados")}`,
        body: `${listar(d.vencemHoje, linhaParcela)}\nToque para marcar como recebido.`,
        url: "/recebimentos",
        tag: "vencem-hoje",
      });
    }

    if (d.atrasadas.length > 0) {
      const n = d.atrasadas.length;
      out.push({
        title: `${n} ${plural(n, "parcela atrasada", "parcelas atrasadas")} · ${brl(soma(d.atrasadas, "valorParcela"))}`,
        body: listar(d.atrasadas, (p) => `${linhaParcela(p)} · venceu ${p.vencimento.split("-").reverse().join("/")}`),
        url: "/recebimentos",
        tag: "atrasadas",
      });
    }
  }

  return out;
}

/** Turno pelo horário de Brasília: antes das 14h é manhã. */
export function turnoPorHorario(agora: Date = new Date()): Turno {
  const hora = Number(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  return hora < 14 ? "manha" : "noite";
}
