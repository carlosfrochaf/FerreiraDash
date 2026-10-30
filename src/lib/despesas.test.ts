import { describe, expect, it } from "vitest";
import { resumirDespesas, separarPorStatus, tipoDaDespesa } from "./despesas";
import type { Movimento } from "./extrato";

let seq = 0;
function mov(p: Partial<Movimento>): Movimento {
  seq++;
  return {
    key: `k${seq}`,
    origem: "lancamento",
    tipo: "SAIDA",
    valor: 100,
    data: "2026-11-10",
    status: "PENDENTE",
    nome: "x",
    categoria: "x",
    categoriaSlug: null,
    recorrente: false,
    descricao: "",
    reclamada: "",
    processoNumero: "",
    advogado: "",
    valorEscritorio: null,
    valorCliente: null,
    lancamentoId: null,
    link: "/",
    ...p,
  };
}

describe("tipoDaDespesa", () => {
  it("advogados: audiência, petição e lançamentos de advogado/audiência", () => {
    expect(tipoDaDespesa(mov({ origem: "audiencia" }))).toBe("advogados");
    expect(tipoDaDespesa(mov({ origem: "peticao" }))).toBe("advogados");
    expect(tipoDaDespesa(mov({ categoriaSlug: "ADVOGADO_COLABORADOR" }))).toBe("advogados");
    expect(tipoDaDespesa(mov({ categoriaSlug: "AUDIENCIA" }))).toBe("advogados");
  });

  it("salários, custos e outras saídas", () => {
    expect(tipoDaDespesa(mov({ categoriaSlug: "SALARIO" }))).toBe("salarios");
    expect(tipoDaDespesa(mov({ categoriaSlug: "CUSTO_OPERACIONAL" }))).toBe("custos");
    expect(tipoDaDespesa(mov({ categoriaSlug: null }))).toBe("outras");
  });

  it("repasses e entradas não são despesa", () => {
    expect(tipoDaDespesa(mov({ origem: "repasse" }))).toBeNull();
    expect(tipoDaDespesa(mov({ categoriaSlug: "REPASSE_CLIENTE" }))).toBeNull();
    expect(tipoDaDespesa(mov({ tipo: "ENTRADA" }))).toBeNull();
    expect(tipoDaDespesa(mov({ origem: "parcela", tipo: "ENTRADA" }))).toBeNull();
  });
});

describe("resumirDespesas", () => {
  it("só o mês pedido, sem repasses, com totais em centavos", () => {
    const r = resumirDespesas(
      [
        mov({ valor: 0.1, status: "PAGO", categoriaSlug: "CUSTO_OPERACIONAL" }),
        mov({ valor: 0.2, status: "PAGO", categoriaSlug: "CUSTO_OPERACIONAL" }),
        mov({ valor: 100, status: "PENDENTE", categoriaSlug: "SALARIO" }),
        mov({ valor: 50, status: "NAO_PAGO", origem: "peticao" }),
        mov({ valor: 999, origem: "repasse" }),
        mov({ valor: 999, data: "2026-10-31", categoriaSlug: "SALARIO" }),
        mov({ valor: 999, tipo: "ENTRADA" }),
      ],
      "2026-11"
    );
    expect(r.total).toBe(150.3);
    expect(r.pago).toBe(0.3);
    expect(r.falta).toBe(150);
    expect(r.porTipo.custos).toEqual({ total: 0.3, quantidade: 2 });
    expect(r.porTipo.salarios).toEqual({ total: 100, quantidade: 1 });
    expect(r.porTipo.advogados).toEqual({ total: 50, quantidade: 1 });
    expect(r.porTipo.outras).toEqual({ total: 0, quantidade: 0 });
    expect(r.itens).toHaveLength(4);
    expect(r.itens.map((i) => i.tipoDespesa)).toEqual(["custos", "custos", "salarios", "advogados"]);
  });
});

describe("separarPorStatus", () => {
  it("pendentes do mais atrasado ao mais novo; pagos do pagamento mais recente ao mais antigo", () => {
    const itens = [
      mov({ key: "a", data: "2026-10-28", status: "PENDENTE" }),
      mov({ key: "b", data: "2026-10-23", status: "PAGO" }),
      mov({ key: "c", data: "2026-10-19", status: "NAO_PAGO" }),
      mov({ key: "d", data: "2026-10-30", status: "PAGO" }),
      mov({ key: "e", data: "2026-10-26", status: "PENDENTE" }),
    ];
    const r = separarPorStatus(itens);
    expect(r.pendentes.map((i) => i.key)).toEqual(["c", "e", "a"]);
    expect(r.pagos.map((i) => i.key)).toEqual(["d", "b"]);
    expect(r.totalPendentes).toBe(300);
    expect(r.totalPagos).toBe(200);
  });
});
