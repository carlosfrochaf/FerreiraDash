import { describe, expect, it } from "vitest";
import { cepValido, cnpjValido, completarContato, contatoDoCnpjWs, empresaDoCnpj, empresaDoCnpjWs, enderecoDoCep, preencherVazios } from "./consulta-publica";

describe("cnpjValido", () => {
  it("aceita com ou sem pontuação, recusa dígito errado", () => {
    expect(cnpjValido("19.131.243/0001-97")).toBe("19131243000197");
    expect(cnpjValido("19131243000197")).toBe("19131243000197");
    expect(cnpjValido("19131243000198")).toBeNull();
    expect(cnpjValido("11111111111111")).toBeNull();
    expect(cnpjValido("123")).toBeNull();
  });
});

describe("cepValido", () => {
  it("só 8 números", () => {
    expect(cepValido("30140-071")).toBe("30140071");
    expect(cepValido("3014")).toBeNull();
  });
});

describe("empresaDoCnpj", () => {
  it("monta razão social, fantasia, endereço, telefones e e-mail", () => {
    const r = empresaDoCnpj({
      razao_social: "PADARIA BOM PAO LTDA",
      nome_fantasia: "BOM PAO",
      logradouro: "RUA DA BAHIA",
      numero: "100",
      complemento: "LOJA 2",
      bairro: "CENTRO",
      municipio: "BELO HORIZONTE",
      uf: "MG",
      cep: "30160011",
      ddd_telefone_1: "3132221111",
      ddd_telefone_2: "31988887777",
      email: "CONTATO@BOMPAO.COM.BR",
    });
    expect(r).toEqual({
      razaoSocial: "PADARIA BOM PAO LTDA",
      nomeFantasia: "BOM PAO",
      endereco: "Rua da Bahia, 100, Loja 2 – Centro – Belo Horizonte/MG – CEP 30160-011",
      telefones: "(31) 3222-1111 / (31) 98888-7777",
      email: "contato@bompao.com.br",
    });
  });

  it("deixa de fora o que vier vazio", () => {
    const r = empresaDoCnpj({ razao_social: "X LTDA", nome_fantasia: "", logradouro: "AV BRASIL", numero: "S/N", municipio: "CONTAGEM", uf: "MG", ddd_telefone_1: "", email: null });
    expect(r).toEqual({ razaoSocial: "X LTDA", nomeFantasia: "", endereco: "Av Brasil, S/N – Contagem/MG", telefones: "", email: "" });
  });
});

describe("enderecoDoCep", () => {
  it("monta rua – bairro e cidade/UF", () => {
    expect(enderecoDoCep({ logradouro: "Rua da Bahia", bairro: "Centro", localidade: "Belo Horizonte", uf: "MG" })).toEqual({
      endereco: "Rua da Bahia – Centro",
      cidadeUf: "Belo Horizonte/MG",
    });
  });
  it("CEP inexistente devolve null", () => {
    expect(enderecoDoCep({ erro: true })).toBeNull();
  });
});

describe("preencherVazios", () => {
  it("só preenche campo vazio e conta quantos", () => {
    const r = preencherVazios({ a: "já tem", b: "", c: null }, { a: "novo", b: "B", c: "", d: "D" });
    expect(r.valores).toEqual({ a: "já tem", b: "B", c: null, d: "D" });
    expect(r.preenchidos).toBe(2);
  });
});

describe("contato pelo CNPJ.ws", () => {
  it("monta telefones e e-mail e completa só o que faltou", () => {
    const extra = contatoDoCnpjWs({ estabelecimento: { ddd1: "11", telefone1: "23851939", ddd2: null, telefone2: null, email: "Torres.Contab@gmail.com" } });
    expect(extra).toEqual({ telefones: "(11) 2385-1939", email: "torres.contab@gmail.com" });
    const base = { razaoSocial: "X", nomeFantasia: "", endereco: "", telefones: "(11) 1111-1111", email: "" };
    expect(completarContato(base, extra)).toEqual({ ...base, email: "torres.contab@gmail.com" });
    expect(completarContato(base, null)).toBe(base);
  });
});

describe("empresaDoCnpjWs", () => {
  it("monta a empresa só com o CNPJ.ws (quando a BrasilAPI falha)", () => {
    const r = {
      razao_social: "PADARIA LTDA",
      estabelecimento: {
        nome_fantasia: "PÃO BOM", tipo_logradouro: "RUA", logradouro: "DAS FLORES", numero: "10", complemento: null,
        bairro: "CENTRO", cep: "30720412", cidade: { nome: "Belo Horizonte" }, estado: { sigla: "MG" },
        ddd1: "31", telefone1: "33334444", email: "A@B.COM",
      },
    };
    expect(empresaDoCnpjWs(r)).toEqual({
      razaoSocial: "PADARIA LTDA",
      nomeFantasia: "PÃO BOM",
      endereco: "Rua das Flores, 10 – Centro – Belo Horizonte/MG – CEP 30720-412",
      telefones: "(31) 3333-4444",
      email: "a@b.com",
    });
  });
});
