// Tela Despesas: o que saiu (ou vai sair) do escritório num mês, por tipo. Puro.
import type { Movimento } from "./extrato";
import { centavosParaString, paraCentavos } from "./parcelas";
import { mesDe } from "./recorrencias";

export type TipoDespesa = "advogados" | "salarios" | "custos" | "outras";

export const TIPOS_DESPESA: { id: TipoDespesa; label: string }[] = [
  { id: "advogados", label: "Advogados" },
  { id: "salarios", label: "Salários" },
  { id: "custos", label: "Custos operacionais" },
  { id: "outras", label: "Outras saídas" },
];

/** null para entradas e repasses (dinheiro do cliente, não despesa do escritório). */
export function tipoDaDespesa(m: Movimento): TipoDespesa | null {
  if (m.tipo !== "SAIDA" || m.origem === "repasse" || m.categoriaSlug === "REPASSE_CLIENTE") return null;
  if (m.origem === "audiencia" || m.origem === "peticao") return "advogados";
  if (m.categoriaSlug === "ADVOGADO_COLABORADOR" || m.categoriaSlug === "AUDIENCIA") return "advogados";
  if (m.categoriaSlug === "SALARIO") return "salarios";
  if (m.categoriaSlug === "CUSTO_OPERACIONAL") return "custos";
  return "outras";
}

export type ItemDespesa = Movimento & { tipoDespesa: TipoDespesa };

/** Mês em que a despesa conta: o de referência (salário) ou o da data. */
export function mesDaDespesa(m: Movimento): string {
  return m.mesReferencia ?? mesDe(m.data);
}

/** Pendente com a data já passada. Salário não tem vencimento: nunca fica atrasado. */
export function estaAtrasado(m: Movimento, hoje: string): boolean {
  return m.status !== "PAGO" && !m.mesReferencia && m.data < hoje;
}

export type ResumoDespesas = {
  total: number;
  pago: number;
  falta: number;
  porTipo: Record<TipoDespesa, { total: number; quantidade: number }>;
  itens: ItemDespesa[];
};

const reais = (c: bigint) => Number(centavosParaString(c));

/** Despesas do mês ("AAAA-MM"), mantendo a ordem dos movimentos. */
export function resumirDespesas(movimentos: Movimento[], mes: string): ResumoDespesas {
  const zero = BigInt(0);
  const porTipo = Object.fromEntries(TIPOS_DESPESA.map((t) => [t.id, { total: zero, quantidade: 0 }])) as Record<
    TipoDespesa,
    { total: bigint; quantidade: number }
  >;
  let total = zero;
  let pago = zero;
  const itens: ItemDespesa[] = [];

  for (const m of movimentos) {
    if (mesDaDespesa(m) !== mes) continue;
    const tipoDespesa = tipoDaDespesa(m);
    if (!tipoDespesa) continue;
    const c = paraCentavos(m.valor);
    total += c;
    if (m.status === "PAGO") pago += c;
    porTipo[tipoDespesa].total += c;
    porTipo[tipoDespesa].quantidade++;
    itens.push({ ...m, tipoDespesa });
  }

  return {
    total: reais(total),
    pago: reais(pago),
    falta: reais(total - pago),
    porTipo: Object.fromEntries(
      TIPOS_DESPESA.map((t) => [t.id, { total: reais(porTipo[t.id].total), quantidade: porTipo[t.id].quantidade }])
    ) as ResumoDespesas["porTipo"],
    itens,
  };
}

/**
 * Lista da tela em dois blocos: o que falta pagar (mais atrasado primeiro)
 * e o que já foi pago (pagamento mais recente primeiro).
 */
export function separarPorStatus<T extends Movimento>(itens: T[]) {
  const pendentes = itens
    .filter((i) => i.status !== "PAGO")
    .sort((a, b) => a.data.localeCompare(b.data) || a.key.localeCompare(b.key));
  const pagos = itens
    .filter((i) => i.status === "PAGO")
    .sort((a, b) => b.data.localeCompare(a.data) || a.key.localeCompare(b.key));
  const soma = (l: T[]) => reais(l.reduce((s, i) => s + paraCentavos(i.valor), BigInt(0)));
  return { pendentes, pagos, totalPendentes: soma(pendentes), totalPagos: soma(pagos) };
}
