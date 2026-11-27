import { describe, expect, it } from "vitest";
import { completarCadastro, completarEmpresa, lerContratoPadrao } from "./contrato-padrao";

describe("completarCadastro", () => {
  const dados = { nascimento: "1990-03-02", cpf: "11144477735", endereco: "RUA A, 1", cep: "32000000", telefone: "31988887777" };
  it("só preenche o que está vazio", () => {
    const atual = { cpf: null, telefone: "31900000000", endereco: "", cep: null, cidadeUf: null, dataNascimento: null };
    expect(completarCadastro(atual, dados, "Contagem/MG")).toEqual({
      cpf: "11144477735",
      endereco: "RUA A, 1",
      cep: "32000000",
      cidadeUf: "Contagem/MG",
      dataNascimento: new Date("1990-03-02T00:00:00Z"),
    });
  });
  it("nada vazio: nada muda", () => {
    const cheio = { cpf: "1", telefone: "2", endereco: "3", cep: "4", cidadeUf: "5", dataNascimento: new Date() };
    expect(completarCadastro(cheio, dados, "X")).toEqual({});
  });
});

describe("completarEmpresa", () => {
  it("nome e CNPJ do contrato, o resto da busca do CNPJ, sem trocar o que já tem", () => {
    const achada = { razaoSocial: "PADARIA LTDA", nomeFantasia: "Pão Bom", endereco: "Rua B, 2", telefones: "(31) 3333-4444", email: "a@b.com" };
    expect(completarEmpresa({ email: "ja@tem.com" }, { empresa: "Padaria Pão Bom LTDA", cnpj: "11222333000181" }, achada)).toEqual({
      email: "ja@tem.com",
      nomeFantasia: "Padaria Pão Bom LTDA",
      cnpj: "11222333000181",
      endereco: "Rua B, 2",
      telefones: "(31) 3333-4444",
    });
  });
  it("sem busca do CNPJ: só o que veio do contrato", () => {
    expect(completarEmpresa(undefined, { empresa: "X LTDA" }, null)).toEqual({ nomeFantasia: "X LTDA" });
  });
});

// Mesmo formato do "Contrato Padrão" (dados inventados).
const TEXTO = `DR. FULANO - OAB/MG 1 CONTRATO DE HONORÁRIOS
Contratante:  MARIA  DA  SILVA,  brasileiro,  nascido  em
02/03/1990, inscrito no CPF: 111.444.777-35, residente e domiciliado na RUA
DAS  FLORES,  10,  AP  2,  CENTRO - CONTAGEM CEP 32000000 e telefone para contato (31)
98888-7777.
Contratado:  DR. FULANO, brasileiro, divorciado,  CPF  626.013.936-53  com escritório na Rua X - CEP 31.720-
190.
Cláusula  Primeira -  O  Contratado  compromete-se,  em  cumprimento  ao
mandato recebido, promover AÇÃO TRABALHISTA em face de Padaria Pão Bom
LTDA 11.222.333/0001-81, com elaboração de petição inicial, com posterior ajuizamento.`;

describe("lerContratoPadrao", () => {
  it("tira os dados da contratante e da empresa", () => {
    expect(lerContratoPadrao(TEXTO)).toEqual({
      nascimento: "1990-03-02",
      cpf: "11144477735",
      endereco: "RUA DAS FLORES, 10, AP 2, CENTRO - CONTAGEM",
      cep: "32000000",
      telefone: "31988887777",
      empresa: "Padaria Pão Bom LTDA",
      cnpj: "11222333000181",
    });
  });

  it("não pega o CPF nem o CEP do advogado contratado", () => {
    const semDados = TEXTO.replace("inscrito no CPF: 111.444.777-35, ", "").replace(" CEP 32000000", "");
    const r = lerContratoPadrao(semDados);
    expect(r.cpf).toBeUndefined();
    expect(r.cep).toBeUndefined();
  });

  it("empresa sem CNPJ: só o nome", () => {
    const r = lerContratoPadrao(TEXTO.replace(" 11.222.333/0001-81", ""));
    expect(r.empresa).toBe("Padaria Pão Bom LTDA");
    expect(r.cnpj).toBeUndefined();
  });

  it("texto de outro modelo: devolve vazio", () => {
    expect(lerContratoPadrao("Procuração ad judicia et extra")).toEqual({});
  });

  it("descarta data e CPF inválidos", () => {
    const r = lerContratoPadrao(TEXTO.replace("02/03/1990", "31/02/1990").replace("111.444.777-35", "111.444.777-00"));
    expect(r.nascimento).toBeUndefined();
    expect(r.cpf).toBeUndefined();
  });
});
