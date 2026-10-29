// Cálculo das parcelas de uma causa/acordo.
// Todo o cálculo é feito em centavos inteiros (BigInt), nunca em float.
// Valores saem como string com 2 casas ("2500.00"), prontos para Prisma.Decimal.

export type ValorEntrada = number | string | { toString(): string };

export interface EntradaParcelas {
  valorTotal: ValorEntrada;
  /** Percentual do escritório, de 0 a 100 (até 2 casas). Ex.: 30 */
  percentualEscritorio: ValorEntrada;
  numeroParcelas: number;
  /** Data do 1º vencimento, "AAAA-MM-DD". O dia se repete nos meses seguintes. */
  primeiroVencimento: string;
  /** Valores personalizados por parcela (ex.: entrada maior). Devem somar o total. */
  valoresParcelas?: ValorEntrada[];
}

export interface ParcelaCalculada {
  numero: number;
  vencimento: string; // "AAAA-MM-DD"
  valorParcela: string;
  valorEscritorio: string;
  valorCliente: string;
}

export interface ResultadoParcelas {
  valorTotal: string;
  valorEscritorio: string;
  valorCliente: string;
  diaVencimento: number;
  parcelas: ParcelaCalculada[];
}

export const MAX_PARCELAS = 120;

// ---------- Dinheiro ----------

/** Converte um valor em reais para centavos. Aceita "2500", "2500.5", "2500,50", 2500.5. */
export function paraCentavos(valor: ValorEntrada): bigint {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) throw new Error("Valor inválido.");
    valor = valor.toFixed(2);
  }
  const texto = valor.toString().trim().replace(",", ".");
  const m = /^(-?)(\d+)(?:\.(\d{1,2})0*)?$/.exec(texto);
  if (!m) throw new Error(`Valor inválido: "${texto}".`);
  const [, sinal, inteiro, frac = ""] = m;
  const centavos = BigInt(inteiro) * 100n + BigInt(frac.padEnd(2, "0"));
  return sinal ? -centavos : centavos;
}

export function centavosParaString(c: bigint): string {
  const neg = c < 0n;
  const abs = neg ? -c : c;
  const reais = abs / 100n;
  const cent = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${reais}.${cent}`;
}

/** Percentual (0–100, até 2 casas) em pontos-base: 30 → 3000, 33.33 → 3333. */
export function paraPontosBase(percentual: ValorEntrada): bigint {
  const pb = paraCentavos(percentual);
  if (pb < 0n || pb > 10000n) throw new Error("O percentual deve estar entre 0 e 100.");
  return pb;
}

/** Aplica o percentual com arredondamento "meio para cima" (centavos ≥ 0). */
function aplicarPercentual(centavos: bigint, pontosBase: bigint): bigint {
  return (centavos * pontosBase + 5000n) / 10000n;
}

// ---------- Datas ----------

function parseData(data: string): { ano: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) throw new Error(`Data inválida: "${data}". Use AAAA-MM-DD.`);
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    throw new Error(`Data inválida: "${data}".`);
  }
  return { ano, mes, dia };
}

function formatarData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Sábado → segunda; domingo → segunda. Feriados não são considerados. */
export function ajustarFimDeSemana(data: Date): Date {
  const dow = data.getUTCDay();
  const somar = dow === 6 ? 2 : dow === 0 ? 1 : 0;
  return new Date(data.getTime() + somar * 86_400_000);
}

/**
 * Gera os vencimentos mensais a partir do 1º. O dia-base se repete todo mês;
 * se o mês não tiver esse dia (ex.: 31 em fevereiro), usa o último dia do mês.
 * Vencimentos em fim de semana vão para a segunda-feira seguinte, sem mudar o dia-base.
 */
export function gerarVencimentos(primeiroVencimento: string, numeroParcelas: number): string[] {
  const { ano, mes, dia } = parseData(primeiroVencimento);
  const datas: string[] = [];
  for (let k = 0; k < numeroParcelas; k++) {
    const mesIndex = mes - 1 + k;
    const ultimoDia = new Date(Date.UTC(ano, mesIndex + 1, 0)).getUTCDate();
    const base = new Date(Date.UTC(ano, mesIndex, Math.min(dia, ultimoDia)));
    datas.push(formatarData(ajustarFimDeSemana(base)));
  }
  return datas;
}

// ---------- Parcelas ----------

/** Divide o total em N partes iguais; a diferença de centavos vai para a última. */
function dividirIgual(total: bigint, n: number): bigint[] {
  const base = total / BigInt(n);
  const partes = Array.from({ length: n }, () => base);
  partes[n - 1] = total - base * BigInt(n - 1);
  return partes;
}

export function calcularParcelas(entrada: EntradaParcelas): ResultadoParcelas {
  const n = entrada.numeroParcelas;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARCELAS) {
    throw new Error(`O número de parcelas deve ser um inteiro entre 1 e ${MAX_PARCELAS}.`);
  }

  const total = paraCentavos(entrada.valorTotal);
  if (total <= 0n) throw new Error("O valor total deve ser maior que zero.");
  if (total < BigInt(n)) throw new Error("O valor total é pequeno demais para esse número de parcelas.");

  const pb = paraPontosBase(entrada.percentualEscritorio);

  let valores: bigint[];
  if (entrada.valoresParcelas) {
    if (entrada.valoresParcelas.length !== n) {
      throw new Error("A quantidade de valores não bate com o número de parcelas.");
    }
    valores = entrada.valoresParcelas.map(paraCentavos);
    if (valores.some((v) => v <= 0n)) throw new Error("Toda parcela deve ter valor maior que zero.");
    const soma = valores.reduce((a, b) => a + b, 0n);
    if (soma !== total) {
      throw new Error(
        `A soma das parcelas (R$ ${centavosParaString(soma)}) é diferente do total (R$ ${centavosParaString(total)}).`
      );
    }
  } else {
    valores = dividirIgual(total, n);
  }

  // O total do escritório é calculado uma vez e repartido entre as parcelas:
  // cada uma recebe sua parte arredondada para baixo, e os centavos que sobram
  // vão para as parcelas com maior fração cortada (empate: as últimas primeiro).
  // Assim a soma sempre bate e nenhuma parcela fica com mais que o próprio valor.
  const escritorioTotal = aplicarPercentual(total, pb);
  const escritorio = valores.map((v) => (v * pb) / 10000n);
  const fracoes = valores.map((v, i) => ({ i, resto: (v * pb) % 10000n }));
  fracoes.sort((a, b) => (a.resto === b.resto ? b.i - a.i : a.resto > b.resto ? -1 : 1));
  let sobra = escritorioTotal - escritorio.reduce((a, b) => a + b, 0n);
  for (const { i } of fracoes) {
    if (sobra <= 0n) break;
    escritorio[i] += 1n;
    sobra -= 1n;
  }

  const vencimentos = gerarVencimentos(entrada.primeiroVencimento, n);

  return {
    valorTotal: centavosParaString(total),
    valorEscritorio: centavosParaString(escritorioTotal),
    valorCliente: centavosParaString(total - escritorioTotal),
    diaVencimento: parseData(entrada.primeiroVencimento).dia,
    parcelas: valores.map((v, i) => ({
      numero: i + 1,
      vencimento: vencimentos[i],
      valorParcela: centavosParaString(v),
      valorEscritorio: centavosParaString(escritorio[i]),
      valorCliente: centavosParaString(v - escritorio[i]),
    })),
  };
}

/**
 * Confere as regras antes de gravar (use no servidor, mesmo que o cliente já tenha calculado):
 * escritório + cliente = parcela, valores não negativos e soma das parcelas = total.
 * Retorna a lista de erros (vazia se estiver tudo certo).
 */
export function validarParcelas(
  valorTotal: ValorEntrada,
  parcelas: Pick<ParcelaCalculada, "numero" | "valorParcela" | "valorEscritorio" | "valorCliente">[]
): string[] {
  const erros: string[] = [];
  let soma = 0n;
  for (const p of parcelas) {
    const v = paraCentavos(p.valorParcela);
    const e = paraCentavos(p.valorEscritorio);
    const c = paraCentavos(p.valorCliente);
    soma += v;
    if (v <= 0n) erros.push(`Parcela ${p.numero}: valor deve ser maior que zero.`);
    if (e < 0n || c < 0n) erros.push(`Parcela ${p.numero}: valores não podem ser negativos.`);
    if (e + c !== v) erros.push(`Parcela ${p.numero}: escritório + cliente diferente do valor da parcela.`);
  }
  if (soma !== paraCentavos(valorTotal)) erros.push("A soma das parcelas é diferente do valor total.");
  return erros;
}

/**
 * Valores das parcelas quando o usuário fixa algumas (ex.: entrada de R$ 4.000):
 * o que sobra do total é dividido igualmente entre as parcelas não fixadas,
 * com a diferença de centavos na última delas.
 * `fixos[i]` = valor digitado para a parcela i, ou undefined se não foi mexida.
 */
export function distribuirRestante(
  valorTotal: ValorEntrada,
  fixos: (ValorEntrada | undefined)[]
): { ok: true; valores: string[] } | { ok: false; erro: string } {
  const total = paraCentavos(valorTotal);
  const fixados = fixos.map((v) => (v === undefined ? null : paraCentavos(v)));
  const somaFixos = fixados.reduce<bigint>((s, v) => s + (v ?? BigInt(0)), BigInt(0));
  const livres = fixados.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const restante = total - somaFixos;

  if (livres.length === 0) {
    if (restante === BigInt(0)) return { ok: true, valores: fixados.map((v) => centavosParaString(v!)) };
    const abs = restante < BigInt(0) ? -restante : restante;
    return {
      ok: false,
      erro: `As parcelas somam R$ ${centavosParaString(somaFixos).replace(".", ",")}: ${restante < BigInt(0) ? "passam" : "faltam"} R$ ${centavosParaString(abs).replace(".", ",")} ${restante < BigInt(0) ? "do" : "para o"} total.`,
    };
  }
  if (restante < BigInt(livres.length)) {
    return { ok: false, erro: "Os valores digitados já passam do total (ou não sobra o suficiente para as outras parcelas)." };
  }

  const partes = dividirIgual(restante, livres.length);
  const valores = fixados.map((v) => (v === null ? "" : centavosParaString(v)));
  livres.forEach((idx, k) => (valores[idx] = centavosParaString(partes[k])));
  return { ok: true, valores };
}
