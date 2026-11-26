import { describe, expect, it } from "vitest";
import { arquivosAssinados, arquivosDoEnvio, chaveTelefone, escolherCliente, linkDoArquivo, segredoDoAviso, tipoPeloNome, ROTULO_ARQUIVO } from "./zapsign";

describe("tipoPeloNome", () => {
  it("reconhece os três documentos", () => {
    expect(tipoPeloNome("Procuração - Ana.pdf")).toBe("PROCURACAO");
    expect(tipoPeloNome("Contrato de Honorários")).toBe("CONTRATO_HONORARIOS");
    expect(tipoPeloNome("DECLARAÇÃO DE HIPOSSUFICIÊNCIA")).toBe("DECLARACAO_HIPOSSUFICIENCIA");
    expect(tipoPeloNome("Termo qualquer")).toBe("OUTRO");
    expect(ROTULO_ARQUIVO.PROCURACAO).toBe("Procuração");
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

const envio = {
  token: "d1",
  name: "Contrato de honorários",
  signed_file: "https://x/1.pdf",
  extra_docs: [
    { token: "e1", name: "Procuração.pdf", signed_file: "https://x/2.pdf" },
    { token: "e2", name: "Declaração", signed_file: null },
  ],
};

describe("arquivosDoEnvio / linkDoArquivo", () => {
  it("lista o principal e os extras já assinados, sem guardar o link (ele vence)", () => {
    expect(arquivosDoEnvio(envio)).toEqual([
      { token: "d1", nome: "Contrato de honorários", tipo: "CONTRATO_HONORARIOS" },
      { token: "e1", nome: "Procuração", tipo: "PROCURACAO" },
    ]);
  });
  it("acha o link atual de um arquivo do envio", () => {
    expect(linkDoArquivo(envio, "e1")).toBe("https://x/2.pdf");
    expect(linkDoArquivo(envio, "e2")).toBeNull();
    expect(linkDoArquivo(envio, "outro")).toBeNull();
  });
});

describe("segredoDoAviso", () => {
  it("é fixo para o mesmo segredo e muda com outro", () => {
    expect(segredoDoAviso("abc")).toBe(segredoDoAviso("abc"));
    expect(segredoDoAviso("abc")).not.toBe(segredoDoAviso("abd"));
    expect(segredoDoAviso("abc")).not.toContain("abc");
  });
});

describe("arquivosAssinados", () => {
  it("principal e extras assinados, cada um com sua origem e tipo pelo nome", () => {
    const doc = {
      token: "d1",
      name: "Contrato de Honorários.pdf",
      signed_file: "https://z/1.pdf",
      extra_docs: [
        { token: "e1", name: "Procuração", signed_file: "https://z/2.pdf" },
        { token: "e2", name: "Sem assinatura", signed_file: null },
      ],
    };
    expect(arquivosAssinados(doc)).toEqual([
      { origem: "zapsign:d1", nome: "Contrato de Honorários.pdf", url: "https://z/1.pdf", tipo: "CONTRATO_HONORARIOS" },
      { origem: "zapsign:e1", nome: "Procuração.pdf", url: "https://z/2.pdf", tipo: "PROCURACAO" },
    ]);
  });
});
