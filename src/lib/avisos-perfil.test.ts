import { describe, expect, it } from "vitest";
import { avisosDoPerfil, dadosDoAdvogado } from "./avisos-perfil";
import type { DadosDoDia, Notificacao } from "./notificacoes";

const n = (tag: string): Notificacao => ({ title: tag, body: "", url: "/", tag });
const todas = ["vencem-hoje", "repasses", "peticoes", "lancamentos-hoje", "advogados-semana", "pagamentos-amanha", "atrasadas", "audiencias-hoje", "audiencias-amanha"].map(n);

describe("avisosDoPerfil", () => {
  it("dono recebe tudo", () => {
    expect(avisosDoPerfil("DONO", todas)).toHaveLength(todas.length);
  });
  it("secretária não recebe dinheiro; financeiro não recebe audiências", () => {
    const sec = avisosDoPerfil("SECRETARIA", todas).map((x) => x.tag);
    expect(sec).not.toContain("vencem-hoje");
    expect(sec).toEqual(["peticoes", "audiencias-hoje", "audiencias-amanha"]);
    const fin = avisosDoPerfil("FINANCEIRO", todas).map((x) => x.tag);
    expect(fin).not.toContain("audiencias-hoje");
    expect(fin).toContain("advogados-semana");
  });
});

describe("dadosDoAdvogado", () => {
  it("fica só com as audiências dele e zera o resto", () => {
    const aud = (advogadoNome: string) => ({ hora: null, clienteNome: "C", reclamada: null, advogadoNome, processoNumero: null });
    const d = {
      vencemHoje: [{}],
      atrasadas: [{}],
      repassesProntos: [{}],
      lancamentosHoje: [{}],
      audienciasHoje: [aud("Ana Souza"), aud("Bruno")],
      audienciasAmanha: [aud(" ana  souza ")],
      peticoesAPagar: { quantidade: 2, total: 100 },
    } as unknown as DadosDoDia;
    const r = dadosDoAdvogado(d, "ana souza");
    expect(r.audienciasHoje).toHaveLength(1);
    expect(r.audienciasAmanha).toHaveLength(1);
    expect(r.vencemHoje).toEqual([]);
    expect(r.peticoesAPagar).toBeUndefined();
  });
});
