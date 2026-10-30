import { StatusPagamento, StatusPeticao, StatusRecebimento, StatusRepasse } from "@prisma/client";
import { prisma } from "./prisma";
import { dataDoDb, formatarData } from "./datas";
import { mesDe, rotuloSalario } from "./recorrencias";

/** Uma linha do extrato, venha de onde vier o dinheiro. */
export type Movimento = {
  key: string;
  origem: "lancamento" | "parcela" | "repasse" | "audiencia" | "peticao";
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  /** Data do pagamento, se já foi pago; senão a data prevista. AAAA-MM-DD */
  data: string;
  status: "PAGO" | "PENDENTE" | "NAO_PAGO";
  /** Nome principal: cliente (causas/lançamentos) ou advogado (audiências). */
  nome: string;
  categoria: string;
  /** Slug da categoria do lançamento avulso (ex.: "SALARIO"); null nas outras origens. */
  categoriaSlug: string | null;
  /** Lançamento criado por uma despesa recorrente. */
  recorrente: boolean;
  /** Salário: mês de trabalho a que se refere, "AAAA-MM" (conta nesse mês). null nos demais. */
  mesReferencia: string | null;
  descricao: string;
  reclamada: string;
  processoNumero: string;
  advogado: string;
  valorEscritorio: number | null;
  valorCliente: number | null;
  /** Para lançamentos avulsos: id usado em editar/excluir. */
  lancamentoId: string | null;
  /** Onde abrir este item. */
  link: string;
};

const LIMITE = 1000;

export async function listarMovimentos(): Promise<Movimento[]> {
  const [transacoes, parcelas, audiencias, peticoes] = await Promise.all([
    prisma.transacao.findMany({
      include: { categoria: true, processo: { include: { cliente: true } }, contato: true },
      orderBy: { dataCompetencia: "desc" },
      take: 500,
    }),
    prisma.parcela.findMany({
      include: { recebimento: true },
      orderBy: { vencimento: "desc" },
      take: LIMITE,
    }),
    prisma.audiencia.findMany({
      where: { valor: { not: null } },
      orderBy: { data: "desc" },
      take: 500,
    }),
    prisma.peticao.findMany({
      where: { valor: { not: null } },
      orderBy: { dataEntrega: "desc" },
      take: 500,
    }),
  ]);

  const out: Movimento[] = [];

  for (const t of transacoes) {
    const salario = t.categoria.slug === "SALARIO";
    const competencia = t.dataCompetencia.toISOString().slice(0, 10);
    out.push({
      key: `l:${t.id}`,
      origem: "lancamento",
      tipo: t.tipo,
      valor: Number(t.valor),
      data: (t.dataPagamento ?? t.dataCompetencia).toISOString().slice(0, 10),
      status: t.status,
      nome: t.clienteNome || t.processo?.cliente.nome || t.contato?.nome || t.descricao || "Sem nome",
      categoria: salario ? rotuloSalario(mesDe(competencia)) : t.categoria.nome,
      categoriaSlug: t.categoria.slug,
      recorrente: t.recorrenciaId !== null,
      mesReferencia: salario ? mesDe(competencia) : null,
      descricao: t.descricao ?? "",
      reclamada: t.reclamada ?? "",
      processoNumero: t.processoNumero || t.processo?.numeroPje || "",
      advogado: "",
      valorEscritorio: null,
      valorCliente: null,
      lancamentoId: t.id,
      link: `/lancamentos/novo?edit=${t.id}`,
    });
  }

  for (const p of parcelas) {
    const r = p.recebimento;
    const recebida = p.statusRecebimento === StatusRecebimento.RECEBIDO;
    const base = {
      nome: r.clienteNome,
      reclamada: r.reclamada ?? "",
      processoNumero: r.processoNumero ?? "",
      advogado: "",
      categoriaSlug: null,
      recorrente: false,
      mesReferencia: null,
      valorEscritorio: Number(p.valorEscritorio),
      valorCliente: Number(p.valorCliente),
      lancamentoId: null,
      link: "/recebimentos",
    };
    out.push({
      ...base,
      key: `p:${p.id}`,
      origem: "parcela",
      tipo: "ENTRADA",
      valor: Number(p.valorParcela),
      data: dataDoDb(p.dataRecebimento ?? p.vencimento),
      status: recebida ? "PAGO" : "PENDENTE",
      categoria: `Parcela ${p.numero}/${r.numeroParcelas}`,
      descricao: r.reclamada ? `Pago por ${r.reclamada}` : "Pagamento da causa",
    });
    // O repasse só existe depois que a empresa pagou a parcela.
    if (recebida && Number(p.valorCliente) > 0) {
      const repassada = p.statusRepasse === StatusRepasse.REPASSADO;
      out.push({
        ...base,
        key: `r:${p.id}`,
        origem: "repasse",
        tipo: "SAIDA",
        valor: Number(p.valorCliente),
        data: dataDoDb(p.dataRepasse ?? p.dataRecebimento!),
        status: repassada ? "PAGO" : "PENDENTE",
        categoria: "Repasse ao cliente",
        descricao: `Parte do cliente na parcela ${p.numero}/${r.numeroParcelas}`,
      });
    }
  }

  for (const a of audiencias) {
    out.push({
      key: `a:${a.id}`,
      origem: "audiencia",
      tipo: "SAIDA",
      valor: Number(a.valor),
      data: dataDoDb(a.dataPagamento ?? a.data),
      status: a.statusPagamento === StatusPagamento.PAGO ? "PAGO" : "PENDENTE",
      nome: a.advogadoNome,
      categoria: "Audiência",
      descricao: `Audiência de ${formatarData(dataDoDb(a.data))}${a.hora ? ` às ${a.hora}` : ""} · cliente ${a.clienteNome}`,
      reclamada: a.reclamada ?? "",
      processoNumero: a.processoNumero ?? "",
      advogado: a.advogadoNome,
      categoriaSlug: null,
      recorrente: false,
      mesReferencia: null,
      valorEscritorio: null,
      valorCliente: null,
      lancamentoId: null,
      link: `/audiencias/${a.id}/editar`,
    });
  }

  for (const p of peticoes) {
    out.push({
      key: `pt:${p.id}`,
      origem: "peticao",
      tipo: "SAIDA",
      valor: Number(p.valor),
      data: dataDoDb(p.dataPagamento ?? p.dataEntrega),
      status: p.status === StatusPeticao.PAGA ? "PAGO" : "PENDENTE",
      nome: p.advogadoNome,
      categoria: "Petição",
      descricao: `${p.descricao} · cliente ${p.clienteNome}`,
      reclamada: p.reclamada ?? "",
      processoNumero: p.processoNumero ?? "",
      advogado: p.advogadoNome,
      categoriaSlug: null,
      recorrente: false,
      mesReferencia: null,
      valorEscritorio: null,
      valorCliente: null,
      lancamentoId: null,
      link: `/peticoes/${p.id}/editar`,
    });
  }

  return out.sort((x, y) => y.data.localeCompare(x.data) || x.key.localeCompare(y.key));
}
