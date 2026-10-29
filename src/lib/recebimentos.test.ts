import { describe, expect, it } from "vitest";
import { montarParcelas, ErroRecebimento } from "./recebimentos";
import { parcelaAcaoSchema, recebimentoSchema } from "./validations";

const base = {
  clienteNome: "Maria Silva",
  reclamada: "Empresa X Ltda",
  processoNumero: "0001234-56.2026.5.03.0001",
  valorTotal: "10000",
  numeroParcelas: 4,
  primeiroVencimento: "2026-11-20",
};

describe("recebimentoSchema", () => {
  it("aplica 30% como padrão e limpa textos vazios", () => {
    const r = recebimentoSchema.parse({ ...base, reclamada: "  ", observacoes: "" });
    expect(r.percentualEscritorio).toBe(30);
    expect(r.reclamada).toBeUndefined();
    expect(r.observacoes).toBeUndefined();
  });

  it("exige cliente, data válida e parcelas entre 1 e 120", () => {
    expect(recebimentoSchema.safeParse({ ...base, clienteNome: " " }).success).toBe(false);
    expect(recebimentoSchema.safeParse({ ...base, primeiroVencimento: "2026-02-30" }).success).toBe(false);
    expect(recebimentoSchema.safeParse({ ...base, numeroParcelas: 0 }).success).toBe(false);
    expect(recebimentoSchema.safeParse({ ...base, numeroParcelas: 121 }).success).toBe(false);
  });

  it("exige que a lista de parcelas tenha o tamanho informado", () => {
    const r = recebimentoSchema.safeParse({
      ...base,
      numeroParcelas: 2,
      parcelas: [{ valorParcela: "10000", vencimento: "2026-11-20" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("montarParcelas", () => {
  it("calcula as parcelas do exemplo do plano", () => {
    const r = montarParcelas(recebimentoSchema.parse(base));
    expect(r.valorEscritorio).toBe("3000.00");
    expect(r.parcelas.map((p) => p.valorCliente)).toEqual(["1750.00", "1750.00", "1750.00", "1750.00"]);
  });

  it("usa valores e datas ajustados na prévia", () => {
    const r = montarParcelas(
      recebimentoSchema.parse({
        ...base,
        numeroParcelas: 2,
        parcelas: [
          { valorParcela: "6000", vencimento: "2026-11-25" },
          { valorParcela: "4000", vencimento: "2027-01-10" },
        ],
      })
    );
    expect(r.parcelas.map((p) => p.vencimento)).toEqual(["2026-11-25", "2027-01-10"]);
    expect(r.parcelas.map((p) => p.valorEscritorio)).toEqual(["1800.00", "1200.00"]);
  });

  it("transforma erro de cálculo em ErroRecebimento (400)", () => {
    const input = recebimentoSchema.parse({
      ...base,
      numeroParcelas: 2,
      parcelas: [
        { valorParcela: "6000", vencimento: "2026-11-25" },
        { valorParcela: "3000", vencimento: "2026-12-25" },
      ],
    });
    expect(() => montarParcelas(input)).toThrow(ErroRecebimento);
  });
});

describe("parcelaAcaoSchema", () => {
  it("aceita as ações conhecidas e rejeita as demais", () => {
    expect(parcelaAcaoSchema.safeParse({ acao: "receber" }).success).toBe(true);
    expect(parcelaAcaoSchema.safeParse({ acao: "repassar", data: "2026-11-21" }).success).toBe(true);
    expect(parcelaAcaoSchema.safeParse({ acao: "alterar_vencimento" }).success).toBe(false);
    expect(parcelaAcaoSchema.safeParse({ acao: "apagar" }).success).toBe(false);
  });
});
