import { describe, expect, it, vi } from "vitest";

const chamadas: { modelo: string; arg: unknown }[] = [];
const modelo = (nome: string) => ({
  updateMany: vi.fn(async (arg: unknown) => (chamadas.push({ modelo: nome, arg }), { count: 1 })),
});
const tx = {
  cliente: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, nome: where.id === "d" ? "João Silva" : "Joao" })),
    update: vi.fn(),
    delete: vi.fn(),
  },
  recebimento: modelo("recebimento"),
  audiencia: modelo("audiencia"),
  peticao: modelo("peticao"),
  documento: modelo("documento"),
  ficha: modelo("ficha"),
};
vi.mock("./prisma", () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));

import { juntarClientes } from "./clientes-servico";

describe("juntarClientes", () => {
  it("leva as fichas e troca o nome escrito nos registros pelo do cliente que fica", async () => {
    await juntarClientes("d", "o");
    expect(chamadas.find((c) => c.modelo === "ficha")?.arg).toEqual({ where: { clienteId: "o" }, data: { clienteId: "d" } });
    for (const m of ["recebimento", "audiencia", "peticao"]) {
      expect(chamadas.find((c) => c.modelo === m)?.arg).toEqual({ where: { clienteId: "o" }, data: { clienteId: "d", clienteNome: "João Silva" } });
    }
  });
});
