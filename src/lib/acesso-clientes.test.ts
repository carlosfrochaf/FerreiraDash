import { describe, expect, it } from "vitest";
import { filtroClientesDoUsuario, podeApagarDocumento } from "./acesso-clientes";

describe("filtroClientesDoUsuario", () => {
  it("escritório vê todos", () => {
    expect(filtroClientesDoUsuario({ perfil: "SECRETARIA", advogadoChave: null })).toEqual({});
  });
  it("advogado sem chave não vê ninguém", () => {
    expect(filtroClientesDoUsuario({ perfil: "ADVOGADO", advogadoChave: null })).not.toEqual({});
  });
  it("advogado vê por ficha, audiência ou petição", () => {
    const f = filtroClientesDoUsuario({ perfil: "ADVOGADO", advogadoChave: "joao" });
    expect(f.OR).toHaveLength(3);
  });
});

describe("podeApagarDocumento", () => {
  it("advogado só o que ele enviou", () => {
    expect(podeApagarDocumento({ id: "a", perfil: "ADVOGADO" }, { enviadoPorId: "a" })).toBe(true);
    expect(podeApagarDocumento({ id: "a", perfil: "ADVOGADO" }, { enviadoPorId: "s" })).toBe(false);
    expect(podeApagarDocumento({ id: "a", perfil: "ADVOGADO" }, { enviadoPorId: null })).toBe(false);
  });
  it("financeiro nunca; secretária sempre", () => {
    expect(podeApagarDocumento({ id: "f", perfil: "FINANCEIRO" }, { enviadoPorId: "f" })).toBe(false);
    expect(podeApagarDocumento({ id: "s", perfil: "SECRETARIA" }, { enviadoPorId: null })).toBe(true);
  });
});
