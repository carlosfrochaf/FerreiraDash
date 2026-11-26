import { describe, expect, it } from "vitest";
import { assinarTicket, lerTicket, nomeSeguro, type DadosEnvio } from "./documentos-envio";

const d: DadosEnvio = {
  id: "doc1",
  usuarioId: "u1",
  clienteId: "c1",
  recebimentoId: null,
  peticaoId: null,
  tipo: "RG",
  nome: "RG da Ana.pdf",
  caminho: "clientes/c1/doc1-RG_da_Ana.pdf",
  mime: "application/pdf",
  tamanho: 8_000_000,
};

describe("ticket de envio de documento", () => {
  it("vai e volta igual", () => {
    expect(lerTicket(assinarTicket(d, "segredo", 1000), "u1", "segredo", 2000)).toEqual(d);
  });
  it("recusa ticket alterado, de outro usuário, com outro segredo ou vencido", () => {
    const t = assinarTicket(d, "segredo", 1000);
    const [corpo, sig] = t.split(".");
    const outroCorpo = Buffer.from(JSON.stringify({ ...d, clienteId: "c2", expira: 9e15 })).toString("base64url");
    expect(lerTicket(`${outroCorpo}.${sig}`, "u1", "segredo", 2000)).toBeNull();
    expect(lerTicket(`${corpo}.x${sig.slice(1)}`, "u1", "segredo", 2000)).toBeNull();
    expect(lerTicket(t, "u2", "segredo", 2000)).toBeNull();
    expect(lerTicket(t, "u1", "outro", 2000)).toBeNull();
    expect(lerTicket(t, "u1", "segredo", 1000 + 3 * 60 * 60 * 1000)).toBeNull();
    expect(lerTicket(undefined, "u1", "segredo")).toBeNull();
    expect(lerTicket("lixo", "u1", "segredo")).toBeNull();
  });
});

describe("nomeSeguro", () => {
  it("tira acento e símbolos", () => {
    expect(nomeSeguro("Petição inicial (João).pdf")).toBe("Peticao_inicial_Joao_.pdf");
  });
});
