import { describe, expect, it } from "vitest";
import { tribunalDoProcesso } from "./tribunais";

describe("tribunalDoProcesso", () => {
  it("Justiça Estadual por UF", () => {
    expect(tribunalDoProcesso("8", "13")).toBe("tjmg");
    expect(tribunalDoProcesso("8", "26")).toBe("tjsp");
    expect(tribunalDoProcesso("8", "09")).toBe("tjgo");
    expect(tribunalDoProcesso("8", "16")).toBe("tjpr");
    expect(tribunalDoProcesso("8", "07")).toBe("tjdft");
  });
  it("Trabalho, Federal e Eleitoral", () => {
    expect(tribunalDoProcesso("5", "03")).toBe("trt3");
    expect(tribunalDoProcesso("5", "24")).toBe("trt24");
    expect(tribunalDoProcesso("4", "06")).toBe("trf6");
    expect(tribunalDoProcesso("6", "13")).toBe("tre-mg");
  });
  it("códigos desconhecidos não caem em SP", () => {
    expect(tribunalDoProcesso("8", "99")).toBeNull();
    expect(tribunalDoProcesso("5", "30")).toBeNull();
    expect(tribunalDoProcesso("1", "00")).toBeNull();
  });
});
