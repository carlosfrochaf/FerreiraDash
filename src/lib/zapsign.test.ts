import { describe, expect, it } from "vitest";
import { arquivosAssinados, chaveTelefone, escolherCliente, tipoPeloNome } from "./zapsign";
import { abrir, fechar } from "./cifra";

describe("tipoPeloNome", () => {
  it("reconhece os três documentos", () => {
    expect(tipoPeloNome("Procuração - Ana.pdf")).toBe("PROCURACAO");
    expect(tipoPeloNome("Contrato de Honorários")).toBe("CONTRATO_HONORARIOS");
    expect(tipoPeloNome("DECLARAÇÃO DE HIPOSSUFICIÊNCIA")).toBe("DECLARACAO_HIPOSSUFICIENCIA");
    expect(tipoPeloNome("Termo qualquer")).toBe("OUTRO");
  });
});

describe("escolherCliente", () => {
  it("pega o primeiro signatário, com CPF e telefone só em números", () => {
    const c = escolherCliente([{ name: " Ana Souza ", email: "a@x.com", phone_country: "55", phone_number: "(11) 98888-7777", cpf: "123.456.789-01" }]);
    expect(c).toEqual({ nome: "Ana Souza", email: "a@x.com", telefone: "11988887777", cpf: "12345678901" });
  });
  it("sem signatário → null", () => {
    expect(escolherCliente([])).toBeNull();
  });
});

describe("chaveTelefone", () => {
  it("compara pelos últimos 11 números", () => {
    expect(chaveTelefone("+55 (11) 98888-7777")).toBe("11988887777");
    expect(chaveTelefone("123")).toBeNull();
  });
});

describe("arquivosAssinados", () => {
  it("junta o principal e os extras assinados", () => {
    const l = arquivosAssinados({
      token: "d1",
      name: "Contrato de honorários",
      signed_file: "https://x/1.pdf",
      extra_docs: [
        { token: "e1", name: "Procuração", signed_file: "https://x/2.pdf" },
        { token: "e2", name: "Declaração", signed_file: null },
      ],
    });
    expect(l).toEqual([
      { origem: "zapsign:d1", nome: "Contrato de honorários.pdf", url: "https://x/1.pdf", tipo: "CONTRATO_HONORARIOS" },
      { origem: "zapsign:e1", nome: "Procuração.pdf", url: "https://x/2.pdf", tipo: "PROCURACAO" },
    ]);
  });
});

describe("cifra", () => {
  it("fecha e abre com a mesma chave; outra chave falha", () => {
    const t = fechar("token-secreto", "chave-a");
    expect(t).not.toContain("token-secreto");
    expect(abrir(t, "chave-a")).toBe("token-secreto");
    expect(() => abrir(t, "chave-b")).toThrow();
  });
});
