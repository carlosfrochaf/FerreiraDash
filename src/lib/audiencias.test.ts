import { describe, expect, it } from "vitest";
import { audienciaSchema } from "./validations";
import { pagamentoInicial } from "./audiencias";

const base = { data: "2026-10-20", advogadoNome: "Winnie", clienteNome: "Amath Ba", valor: "100.00" };

describe("audiência cadastrada já paga", () => {
  it("exige o valor para salvar como paga", () => {
    const r = audienciaSchema.safeParse({ ...base, valor: "", pago: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Informe o valor pago.");
  });

  it("aceita paga com valor e data do pagamento", () => {
    const r = audienciaSchema.safeParse({ ...base, pago: true, dataPagamento: "2026-10-21" });
    expect(r.success).toBe(true);
  });

  it("pagamentoInicial: paga na data informada, ou hoje; senão nada", () => {
    const hoje = "2026-10-30";
    expect(pagamentoInicial({ pago: true, dataPagamento: "2026-10-21" }, hoje)).toEqual({ statusPagamento: "PAGO", dataPagamento: "2026-10-21" });
    expect(pagamentoInicial({ pago: true }, hoje)).toEqual({ statusPagamento: "PAGO", dataPagamento: "2026-10-30" });
    expect(pagamentoInicial({ pago: false, dataPagamento: "2026-10-21" }, hoje)).toEqual({});
    expect(pagamentoInicial({}, hoje)).toEqual({});
  });
});
