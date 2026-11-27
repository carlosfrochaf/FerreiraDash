// Lucro ou prejuízo de cada causa: só o que entra e sai dela. Puro.
import { centavosParaString, paraCentavos } from "./parcelas";

export type CausaBase = {
  id: string;
  processoNumero: string | null;
  clienteId: string | null;
  clienteNome: string;
  parcelas: { valorEscritorio: string; statusRecebimento: string }[];
};

/** Audiência, petição ou lançamento que pode pertencer a uma causa. */
export type ItemCausa = {
  origem: "AUDIENCIA" | "PETICAO" | "LANCAMENTO";
  descricao: string;
  data: string;
  valor: string;
  tipo: "ENTRADA" | "SAIDA";
  pago: boolean;
  processoNumero: string | null;
  clienteId: string | null;
  clienteNome: string | null;
};

export type ResultadoCausa = {
  entrou: number;
  gastou: number;
  resultado: number;
  vaiEntrar: number;
  aPagar: number;
  itens: ItemCausa[];
};

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const nome = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const reais = (c: bigint) => Number(centavosParaString(c));

/** A causa do item: pelo número do processo; sem número, pela pessoa, se ela tiver uma causa só. */
function causaDoItem(i: ItemCausa, causas: CausaBase[]): CausaBase | undefined {
  const num = digitos(i.processoNumero);
  if (num) return causas.find((c) => digitos(c.processoNumero) === num);
  const daPessoa = causas.filter((c) => (i.clienteId ? c.clienteId === i.clienteId : !!i.clienteNome && nome(c.clienteNome) === nome(i.clienteNome)));
  return daPessoa.length === 1 ? daPessoa[0] : undefined;
}

export function resultadoDasCausas(causas: CausaBase[], itens: ItemCausa[]): Record<string, ResultadoCausa> {
  const soma = new Map(causas.map((c) => [c.id, { entrou: BigInt(0), gastou: BigInt(0), vaiEntrar: BigInt(0), aPagar: BigInt(0), itens: [] as ItemCausa[] }]));
  for (const c of causas) {
    const s = soma.get(c.id)!;
    for (const p of c.parcelas) {
      if (p.statusRecebimento === "RECEBIDO") s.entrou += paraCentavos(p.valorEscritorio);
      else s.vaiEntrar += paraCentavos(p.valorEscritorio);
    }
  }
  for (const i of itens) {
    const c = causaDoItem(i, causas);
    if (!c) continue;
    const s = soma.get(c.id)!;
    const v = paraCentavos(i.valor);
    if (i.tipo === "ENTRADA") {
      if (i.pago) s.entrou += v;
      else s.vaiEntrar += v;
    } else if (i.pago) s.gastou += v;
    else s.aPagar += v;
    s.itens.push(i);
  }
  const out: Record<string, ResultadoCausa> = {};
  for (const [id, s] of soma) {
    out[id] = {
      entrou: reais(s.entrou),
      gastou: reais(s.gastou),
      resultado: reais(s.entrou - s.gastou),
      vaiEntrar: reais(s.vaiEntrar),
      aPagar: reais(s.aPagar),
      itens: s.itens.sort((a, b) => a.data.localeCompare(b.data)),
    };
  }
  return out;
}
