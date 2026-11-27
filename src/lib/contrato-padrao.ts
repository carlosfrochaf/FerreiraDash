// Lê os dados do "Contrato Padrão" de honorários (sempre o mesmo modelo) para completar cadastro e ficha.
import { cnpjValido, cepValido, preencherVazios, type EmpresaEncontrada } from "./consulta-publica";

type CadastroAtual = {
  cpf: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
  cidadeUf: string | null;
  dataNascimento: Date | null;
};

const vazio = (v: unknown) => v == null || v === "";

/** O que gravar no cadastro do cliente: só campos vazios. */
export function completarCadastro(atual: CadastroAtual, d: DadosContrato, cidadeUf: string | null): Partial<CadastroAtual> {
  const novo: Partial<CadastroAtual> = {};
  if (vazio(atual.cpf) && d.cpf) novo.cpf = d.cpf;
  if (vazio(atual.telefone) && d.telefone) novo.telefone = d.telefone;
  if (vazio(atual.endereco) && d.endereco) novo.endereco = d.endereco;
  if (vazio(atual.cep) && d.cep) novo.cep = d.cep;
  if (vazio(atual.cidadeUf) && cidadeUf) novo.cidadeUf = cidadeUf;
  if (vazio(atual.dataNascimento) && d.nascimento) novo.dataNascimento = new Date(`${d.nascimento}T00:00:00Z`);
  return novo;
}

type EmpresaFicha = { cnpj?: string; nomeFantasia?: string; email?: string; endereco?: string; telefones?: string; localTrabalho?: string };

/** Bloco "empresa" da ficha: nome e CNPJ do contrato, endereço/telefones/e-mail da busca do CNPJ; não troca o que já tem. */
export function completarEmpresa(atual: EmpresaFicha | undefined, d: DadosContrato, achada: EmpresaEncontrada | null): EmpresaFicha {
  const novos: Record<string, string> = {
    nomeFantasia: d.empresa || achada?.nomeFantasia || achada?.razaoSocial || "",
    cnpj: d.cnpj ?? "",
    endereco: achada?.endereco ?? "",
    telefones: achada?.telefones ?? "",
    email: achada?.email ?? "",
  };
  return preencherVazios({ ...(atual ?? {}) }, novos).valores;
}
import { cpfValido } from "./pix";

export type DadosContrato = {
  nascimento?: string; // AAAA-MM-DD
  cpf?: string;
  endereco?: string;
  cep?: string;
  telefone?: string;
  empresa?: string;
  cnpj?: string;
};

const digitos = (s: string) => s.replace(/\D/g, "");

function dataIso(br: string): string | undefined {
  const [d, m, a] = br.split("/").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined;
  return dt.toISOString().slice(0, 10);
}

/** Dados da contratante (antes de "Contratado:") e da empresa ("em face de ..."). Campo não achado fica de fora. */
export function lerContratoPadrao(texto: string): DadosContrato {
  const t = texto.replace(/\s+/g, " ");
  const ini = t.search(/Contratante:/i);
  if (ini < 0) return {};
  const fim = t.slice(ini).search(/Contratad[oa]:/i);
  const parte = fim < 0 ? t.slice(ini) : t.slice(ini, ini + fim);
  const r: DadosContrato = {};

  const nasc = parte.match(/nascid[oa] em (\d{2}\/\d{2}\/\d{4})/i);
  if (nasc) r.nascimento = dataIso(nasc[1]);
  const cpf = parte.match(/CPF:?\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
  if (cpf && cpfValido(digitos(cpf[1]))) r.cpf = digitos(cpf[1]);
  const end = parte.match(/residente e domiciliad[oa] (?:na|no|em)\s+(.+?)\s*(?:,\s*)?(?:CEP|e telefone)/i);
  if (end) r.endereco = end[1].replace(/[\s,-]+$/, "").trim();
  const cep = parte.match(/CEP:?\s*(\d{2}\.?\d{3}-?\s?\d{3})/i);
  if (cep) r.cep = cepValido(cep[1]) ?? undefined;
  const tel = parte.match(/telefone para contato:?\s*(\(?\d{2}\)?\s*9?\d{4}-?\s?\d{4})/i);
  if (tel) {
    const d = digitos(tel[1]);
    if (d.length === 10 || d.length === 11) r.telefone = d;
  }

  const face = t.match(/em face de\s+(.+?)(?:,?\s*(?:CNPJ:?\s*)?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}))?\s*,\s*com elabora/i);
  if (face) {
    const nome = face[1].replace(/[\s,-]+$/, "").trim();
    if (nome && nome.length <= 200) r.empresa = nome;
    if (face[2]) r.cnpj = cnpjValido(face[2]) ?? undefined;
  }
  for (const k of Object.keys(r) as (keyof DadosContrato)[]) if (r[k] === undefined) delete r[k];
  return r;
}
