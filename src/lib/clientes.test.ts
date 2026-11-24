import { describe, expect, it } from "vitest";
import { agruparNomes, contar, nomeExibicao, telefoneExibicao, chaveCliente, cpfValido, linkWhatsApp, mascararCpf } from "./clientes";

describe("clientes", () => {
  it("chaveCliente ignora acento, maiúsculas e espaços", () => {
    expect(chaveCliente(" Edvânia  CRISTINA ")).toBe(chaveCliente("edvania cristina"));
    expect(chaveCliente("José")).toBe("jose");
  });

  it("mascararCpf e cpfValido", () => {
    expect(mascararCpf("529.982.247-25")).toBe("***.982.247-**");
    expect(mascararCpf("123")).toBe("123");
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("52998224724")).toBe(false);
  });

  it("linkWhatsApp", () => {
    expect(linkWhatsApp("(31) 98765-4321")).toBe("https://wa.me/5531987654321");
    expect(linkWhatsApp("+55 31 98765-4321")).toBe("https://wa.me/5531987654321");
    expect(linkWhatsApp("123")).toBeNull();
  });

  it("agruparNomes junta os iguais e mantém o nome mais usado", () => {
    expect(agruparNomes(["Maria Silva", "MARIA SILVA", "maria  silva", "João", "Joao"])).toEqual([
      { chave: "joao", nome: "João" },
      { chave: "maria silva", nome: "MARIA SILVA" },
    ]);
  });
});

describe("exibição na lista", () => {
  it("nomeExibicao só arruma nome todo em maiúsculas", () => {
    expect(nomeExibicao("THAYSSA MARIA DELMIRO VELOSO")).toBe("Thayssa Maria Delmiro Veloso");
    expect(nomeExibicao("JOÃO DA SILVA DOS SANTOS")).toBe("João da Silva dos Santos");
    expect(nomeExibicao("Ana de SOUZA")).toBe("Ana de SOUZA");
  });
  it("telefoneExibicao formata fixo e celular", () => {
    expect(telefoneExibicao("31996229190")).toBe("(31) 99622-9190");
    expect(telefoneExibicao("553132221111")).toBe("(31) 3222-1111");
    expect(telefoneExibicao("123")).toBe("123");
  });
  it("contar usa singular e plural", () => {
    expect(contar(1, "causa", "causas")).toBe("1 causa");
    expect(contar(2, "petição", "petições")).toBe("2 petições");
  });
});
