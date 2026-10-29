import { describe, expect, it } from "vitest";
import { montarNotificacoes, proximoDiaDePagamento, turnoPorHorario, type DadosDoDia, type ParcelaAviso } from "./notificacoes";

const parcela = (o: Partial<ParcelaAviso> = {}): ParcelaAviso => ({
  numero: 2,
  totalParcelas: 5,
  vencimento: "2026-11-20",
  valorParcela: 2500,
  valorEscritorio: 750,
  valorCliente: 1750,
  clienteNome: "Maria Silva",
  reclamada: "Empresa X Ltda",
  processoNumero: "0001234-56.2026.5.03.0001",
  ...o,
});

// Intl usa espaço não separável depois de "R$"; normaliza para comparar.
const txt = (s: string) => s.replace(/ /g, " ");
const montar = (...a: Parameters<typeof montarNotificacoes>) =>
  montarNotificacoes(...a).map((n) => ({ ...n, title: txt(n.title), body: txt(n.body) }));

const vazio: DadosDoDia = { vencemHoje: [], atrasadas: [], repassesProntos: [], lancamentosHoje: [] };

describe("montarNotificacoes", () => {
  it("nada a avisar = nenhuma notificação", () => {
    expect(montar("manha", vazio)).toEqual([]);
    expect(montar("noite", vazio)).toEqual([]);
  });

  it("manhã, uma parcela: empresa, cliente, parcela, valores e processo", () => {
    const [n] = montar("manha", { ...vazio, vencemHoje: [parcela()] });
    expect(n.title).toBe("Hoje tem pagamento: Empresa X Ltda");
    expect(n.body).toContain("Cliente: Maria Silva · parcela 2/5");
    expect(n.body).toContain("R$ 2.500,00");
    expect(n.body).toContain("R$ 750,00");
    expect(n.body).toContain("Proc. 0001234-56.2026.5.03.0001");
    expect(n.url).toBe("/recebimentos");
  });

  it("várias parcelas no mesmo dia viram uma notificação só", () => {
    const lista = Array.from({ length: 6 }, (_, i) => parcela({ clienteNome: `Cliente ${i}` }));
    const ns = montar("manha", { ...vazio, vencemHoje: lista });
    expect(ns).toHaveLength(1);
    expect(ns[0].title).toMatch(/^6 pagamentos hoje/);
    expect(ns[0].body).toContain("e mais 2");
  });

  it("manhã avisa repasses prontos com o valor do cliente", () => {
    const ns = montar("manha", { ...vazio, repassesProntos: [parcela()] });
    expect(ns[0].title).toBe("1 repasse a fazer · R$ 1.750,00");
    expect(ns[0].body).toContain("Cliente: Maria Silva · R$ 1.750,00");
  });

  it("noite: pendentes de hoje e atrasadas; repasses não repetem", () => {
    const ns = montar("noite", {
      ...vazio,
      vencemHoje: [parcela()],
      atrasadas: [parcela({ vencimento: "2026-11-10" }), parcela({ vencimento: "2026-11-12" })],
      repassesProntos: [parcela()],
    });
    expect(ns.map((n) => n.tag)).toEqual(["vencem-hoje", "atrasadas"]);
    expect(ns[1].title).toBe("2 parcelas atrasadas · R$ 5.000,00");
    expect(ns[1].body).toContain("venceu 10/11/2026");
  });

  it("sem empresa informada não quebra", () => {
    const [n] = montar("manha", { ...vazio, vencemHoje: [parcela({ reclamada: null, processoNumero: null })] });
    expect(n.title).toBe("Hoje tem pagamento: Empresa não informada");
    expect(n.body).not.toContain("Proc.");
  });
});

describe("audiências", () => {
  const aud = { hora: "14:00", clienteNome: "Maria Silva", reclamada: "Empresa X", advogadoNome: "Dr. João", processoNumero: null };

  it("8h avisa audiência de hoje com cliente, empresa e advogado", () => {
    const [n] = montar("manha", { ...vazio, audienciasHoje: [aud] });
    expect(n.title).toBe("Audiência hoje às 14:00: Maria Silva");
    expect(n.body).toContain("Empresa: Empresa X");
    expect(n.body).toContain("Advogado: Dr. João");
  });

  it("19h lembra as de amanhã, agrupadas", () => {
    const [n] = montar("noite", { ...vazio, audienciasAmanha: [aud, { ...aud, hora: "09:30", clienteNome: "José" }] });
    expect(n.title).toBe("2 audiências amanhã");
    expect(n.body).toContain("09:30 · José × Empresa X · Adv. Dr. João");
  });
});

describe("petições", () => {
  it("8h resume as petições não pagas", () => {
    const [n] = montar("manha", { ...vazio, peticoesAPagar: { quantidade: 3, total: 900 } });
    expect(n.title).toBe("Petições dos advogados");
    expect(n.body).toBe("3 petições não pagas · R$ 900,00");
  });
  it("19h não repete o resumo", () => {
    expect(montar("noite", { ...vazio, peticoesAPagar: { quantidade: 2, total: 1 } })).toEqual([]);
  });
});

describe("pagamentos do próximo dia (19h)", () => {
  it("avisa o pagamento de amanhã com empresa, cliente e valores", () => {
    const [n] = montar("noite", { ...vazio, proximoPagamento: { quando: "amanhã", parcelas: [parcela()] } });
    expect(n.title).toBe("Pagamento amanhã: Empresa X Ltda");
    expect(n.body).toContain("Cliente: Maria Silva · parcela 2/5");
    expect(n.body).toContain("R$ 2.500,00 (seu escritório: R$ 750,00)");
  });
  it("vários pagamentos viram um aviso só; a manhã não repete", () => {
    const prox = { quando: "segunda", parcelas: [parcela(), parcela({ clienteNome: "José" })] };
    expect(montar("noite", { ...vazio, proximoPagamento: prox })[0].title).toBe("2 pagamentos segunda · R$ 5.000,00");
    expect(montar("manha", { ...vazio, proximoPagamento: prox })).toEqual([]);
  });
  it("sexta avisa os de segunda; nos outros dias, os de amanhã", () => {
    expect(proximoDiaDePagamento("2026-10-29")).toEqual({ data: "2026-10-30", quando: "amanhã" }); // quinta
    expect(proximoDiaDePagamento("2026-10-30")).toEqual({ data: "2026-11-02", quando: "segunda" }); // sexta
    expect(proximoDiaDePagamento("2026-11-01")).toEqual({ data: "2026-11-02", quando: "amanhã" }); // domingo
  });
});

describe("turnoPorHorario", () => {
  it("usa o horário de Brasília", () => {
    expect(turnoPorHorario(new Date("2026-11-20T11:00:00Z"))).toBe("manha"); // 8h
    expect(turnoPorHorario(new Date("2026-11-20T22:00:00Z"))).toBe("noite"); // 19h
  });
});
