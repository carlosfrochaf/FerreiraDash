import { describe, expect, it } from "vitest";
import {
  calcularParcelas,
  centavosParaString,
  gerarVencimentos,
  paraCentavos,
  validarParcelas,
} from "./parcelas";

function somar(valores: string[]): string {
  return centavosParaString(valores.reduce((acc, v) => acc + paraCentavos(v), BigInt(0)));
}

describe("paraCentavos", () => {
  it("aceita formatos comuns", () => {
    expect(paraCentavos("2500")).toBe(BigInt(250000));
    expect(paraCentavos("2500,5")).toBe(BigInt(250050));
    expect(paraCentavos("2500.50")).toBe(BigInt(250050));
    expect(paraCentavos(0.1 + 0.2)).toBe(BigInt(30));
    expect(paraCentavos({ toString: () => "10.00" })).toBe(BigInt(1000));
  });

  it("rejeita mais de 2 casas e texto inválido", () => {
    expect(() => paraCentavos("10.505")).toThrow();
    expect(() => paraCentavos("1.000,00")).toThrow();
    expect(() => paraCentavos("abc")).toThrow();
  });
});

describe("calcularParcelas: valores", () => {
  it("exemplo do plano: R$ 10.000, 30%, 4 parcelas", () => {
    const r = calcularParcelas({
      valorTotal: 10000,
      percentualEscritorio: 30,
      numeroParcelas: 4,
      primeiroVencimento: "2026-11-20",
    });
    expect(r.valorEscritorio).toBe("3000.00");
    expect(r.valorCliente).toBe("7000.00");
    for (const p of r.parcelas) {
      expect(p.valorParcela).toBe("2500.00");
      expect(p.valorEscritorio).toBe("750.00");
      expect(p.valorCliente).toBe("1750.00");
    }
  });

  it("à vista = 1 parcela", () => {
    const r = calcularParcelas({
      valorTotal: "1234.56",
      percentualEscritorio: 30,
      numeroParcelas: 1,
      primeiroVencimento: "2026-11-20",
    });
    expect(r.parcelas).toHaveLength(1);
    expect(r.parcelas[0].valorParcela).toBe("1234.56");
    expect(r.parcelas[0].valorEscritorio).toBe("370.37"); // 370.368 → 370.37
    expect(r.parcelas[0].valorCliente).toBe("864.19");
  });

  it("diferença de centavos vai para a última parcela", () => {
    const r = calcularParcelas({
      valorTotal: 100,
      percentualEscritorio: 30,
      numeroParcelas: 3,
      primeiroVencimento: "2026-11-20",
    });
    expect(r.parcelas.map((p) => p.valorParcela)).toEqual(["33.33", "33.33", "33.34"]);
    expect(somar(r.parcelas.map((p) => p.valorParcela))).toBe("100.00");
  });

  it("soma do escritório sempre bate com o percentual do total", () => {
    // Casos em que arredondar parcela por parcela erraria por centavos.
    const casos = [
      { valorTotal: "1000.01", percentualEscritorio: "33.33", numeroParcelas: 7 },
      { valorTotal: "0.10", percentualEscritorio: 15, numeroParcelas: 10 },
      { valorTotal: "99999.99", percentualEscritorio: "27.5", numeroParcelas: 11 },
      { valorTotal: 50, percentualEscritorio: 30, numeroParcelas: 3 },
    ];
    for (const c of casos) {
      const r = calcularParcelas({ ...c, primeiroVencimento: "2026-01-31" });
      expect(somar(r.parcelas.map((p) => p.valorEscritorio))).toBe(r.valorEscritorio);
      expect(somar(r.parcelas.map((p) => p.valorCliente))).toBe(r.valorCliente);
      expect(somar(r.parcelas.map((p) => p.valorParcela))).toBe(r.valorTotal);
      expect(validarParcelas(r.valorTotal, r.parcelas)).toEqual([]);
    }
  });

  it("1000 casos aleatórios: somas sempre fecham e nenhum valor negativo", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < 1000; k++) {
      const n = 1 + Math.floor(rand() * 24);
      const totalCent = n + Math.floor(rand() * 5_000_000);
      const pct = (Math.floor(rand() * 10001) / 100).toFixed(2);
      const r = calcularParcelas({
        valorTotal: centavosParaString(BigInt(totalCent)),
        percentualEscritorio: pct,
        numeroParcelas: n,
        primeiroVencimento: "2026-11-20",
      });
      expect(validarParcelas(r.valorTotal, r.parcelas)).toEqual([]);
      expect(somar(r.parcelas.map((p) => p.valorEscritorio))).toBe(r.valorEscritorio);
    }
  });

  it("percentual 0 e 100", () => {
    const zero = calcularParcelas({ valorTotal: 900, percentualEscritorio: 0, numeroParcelas: 3, primeiroVencimento: "2026-11-20" });
    expect(zero.valorEscritorio).toBe("0.00");
    const cem = calcularParcelas({ valorTotal: 900, percentualEscritorio: 100, numeroParcelas: 3, primeiroVencimento: "2026-11-20" });
    expect(cem.valorCliente).toBe("0.00");
  });

  it("aceita valores personalizados (entrada maior)", () => {
    const r = calcularParcelas({
      valorTotal: 10000,
      percentualEscritorio: 30,
      numeroParcelas: 3,
      primeiroVencimento: "2026-11-20",
      valoresParcelas: ["5000", "2500", "2500"],
    });
    expect(r.parcelas.map((p) => p.valorEscritorio)).toEqual(["1500.00", "750.00", "750.00"]);
    expect(r.parcelas.map((p) => p.valorCliente)).toEqual(["3500.00", "1750.00", "1750.00"]);
  });

  it("rejeita valores personalizados que não somam o total", () => {
    expect(() =>
      calcularParcelas({
        valorTotal: 10000,
        percentualEscritorio: 30,
        numeroParcelas: 2,
        primeiroVencimento: "2026-11-20",
        valoresParcelas: ["5000", "4000"],
      })
    ).toThrow(/soma/);
  });

  it("rejeita entradas inválidas", () => {
    const base = { valorTotal: 1000, percentualEscritorio: 30, numeroParcelas: 2, primeiroVencimento: "2026-11-20" };
    expect(() => calcularParcelas({ ...base, valorTotal: 0 })).toThrow();
    expect(() => calcularParcelas({ ...base, percentualEscritorio: 101 })).toThrow();
    expect(() => calcularParcelas({ ...base, numeroParcelas: 0 })).toThrow();
    expect(() => calcularParcelas({ ...base, numeroParcelas: 2.5 })).toThrow();
    expect(() => calcularParcelas({ ...base, primeiroVencimento: "2026-02-30" })).toThrow();
  });
});

describe("gerarVencimentos", () => {
  it("exemplo do plano: dia 20, 5 parcelas (com ajuste de fim de semana)", () => {
    // 20/12/2026 é domingo → 21/12; 20/02/2027 é sábado → 22/02.
    expect(gerarVencimentos("2026-11-20", 5)).toEqual([
      "2026-11-20",
      "2026-12-21",
      "2027-01-20",
      "2027-02-22",
      "2027-03-22", // 20/03/2027 é sábado
    ]);
  });

  it("dia 31: usa o último dia do mês sem perder o dia-base", () => {
    // 31/01/2028 seg; 29/02/2028 ter (bissexto); 31/03/2028 sex; 30/04/2028 dom → 01/05.
    expect(gerarVencimentos("2028-01-31", 4)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
      "2028-05-01",
    ]);
  });

  it("1º vencimento num sábado vai para segunda", () => {
    expect(gerarVencimentos("2026-10-31", 1)).toEqual(["2026-11-02"]);
  });

  it("vira o ano corretamente", () => {
    const datas = gerarVencimentos("2026-11-10", 3);
    expect(datas[2].startsWith("2027-01")).toBe(true);
  });
});

describe("validarParcelas", () => {
  it("aponta parcela em que escritório + cliente não fecha", () => {
    const erros = validarParcelas("100.00", [
      { numero: 1, valorParcela: "100.00", valorEscritorio: "30.00", valorCliente: "69.99" },
    ]);
    expect(erros).toHaveLength(1);
  });
});
