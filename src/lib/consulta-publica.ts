// Consultas públicas gratuitas: CNPJ (BrasilAPI) e CEP (ViaCEP). Regras puras + busca no navegador.

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** CNPJ só com números, se os dígitos verificadores batem. */
export function cnpjValido(cnpj: string): string | null {
  const d = digitos(cnpj);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return null;
  const dv = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const n of base) {
      soma += Number(n) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(d.slice(0, 12));
  const d2 = dv(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`) ? d : null;
}

export function cepValido(cep: string): string | null {
  const d = digitos(cep);
  return d.length === 8 ? d : null;
}

const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e"]);
/** "RUA DA BAHIA" → "Rua da Bahia". */
function titulo(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : /^s\/n$/.test(p) ? "S/N" : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

function telefone(t: string | null | undefined): string {
  const d = digitos(t);
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return d;
}

export type RespostaCnpj = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  email?: string | null;
};

export type EmpresaEncontrada = { razaoSocial: string; nomeFantasia: string; endereco: string; telefones: string; email: string };

export function empresaDoCnpj(r: RespostaCnpj): EmpresaEncontrada {
  const rua = [titulo(r.logradouro), (r.numero ?? "").trim().toUpperCase() === "S/N" ? "S/N" : (r.numero ?? "").trim(), titulo(r.complemento)].filter(Boolean).join(", ");
  const cidade = [titulo(r.municipio), (r.uf ?? "").trim().toUpperCase()].filter(Boolean).join("/");
  const cep = digitos(r.cep);
  const endereco = [rua, titulo(r.bairro), cidade, cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : ""].filter(Boolean).join(" – ");
  return {
    razaoSocial: (r.razao_social ?? "").trim(),
    nomeFantasia: (r.nome_fantasia ?? "").trim(),
    endereco,
    telefones: [r.ddd_telefone_1, r.ddd_telefone_2].map(telefone).filter(Boolean).join(" / "),
    email: (r.email ?? "").trim().toLowerCase(),
  };
}

export type RespostaCep = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string };

export function enderecoDoCep(r: RespostaCep): { endereco: string; cidadeUf: string } | null {
  if (r.erro || !r.localidade) return null;
  return {
    endereco: [r.logradouro, r.bairro].map((s) => (s ?? "").trim()).filter(Boolean).join(" – "),
    cidadeUf: [r.localidade, r.uf].filter(Boolean).join("/"),
  };
}

type V = unknown;
/** Junta só nos campos vazios; devolve quantos preencheu. */
export function preencherVazios<T extends Record<string, unknown>>(atual: T, novos: Record<string, string>): { valores: T; preenchidos: number } {
  const valores: Record<string, V> = { ...atual };
  let preenchidos = 0;
  for (const [k, v] of Object.entries(novos)) {
    const vazio = valores[k] == null || valores[k] === "";
    if (vazio && v) {
      valores[k] = v;
      preenchidos++;
    }
  }
  return { valores: valores as T, preenchidos };
}

export type RespostaCnpjWs = {
  razao_social?: string | null;
  estabelecimento?: {
    ddd1?: string | null;
    telefone1?: string | null;
    ddd2?: string | null;
    telefone2?: string | null;
    email?: string | null;
    nome_fantasia?: string | null;
    tipo_logradouro?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cep?: string | null;
    cidade?: { nome?: string | null } | null;
    estado?: { sigla?: string | null } | null;
  } | null;
};

/** Empresa inteira pelo CNPJ.ws (reserva quando a BrasilAPI falha). */
export function empresaDoCnpjWs(r: RespostaCnpjWs): EmpresaEncontrada {
  const e = r.estabelecimento ?? {};
  return completarContato(
    empresaDoCnpj({
      razao_social: r.razao_social,
      nome_fantasia: e.nome_fantasia,
      logradouro: [e.tipo_logradouro, e.logradouro].filter(Boolean).join(" "),
      numero: e.numero,
      complemento: e.complemento,
      bairro: e.bairro,
      municipio: e.cidade?.nome,
      uf: e.estado?.sigla,
      cep: e.cep,
    }),
    contatoDoCnpjWs(r),
  );
}

/** Telefones e e-mail do CNPJ.ws (que costuma ter o e-mail que a BrasilAPI não traz). */
export function contatoDoCnpjWs(r: RespostaCnpjWs): { telefones: string; email: string } {
  const e = r.estabelecimento ?? {};
  const tel = (ddd?: string | null, n?: string | null) => (n ? telefone(`${ddd ?? ""}${n}`) : "");
  return {
    telefones: [tel(e.ddd1, e.telefone1), tel(e.ddd2, e.telefone2)].filter(Boolean).join(" / "),
    email: (e.email ?? "").trim().toLowerCase(),
  };
}

/** Completa o que a primeira consulta deixou vazio. */
export function completarContato(base: EmpresaEncontrada, extra: { telefones: string; email: string } | null): EmpresaEncontrada {
  if (!extra) return base;
  return { ...base, telefones: base.telefones || extra.telefones, email: base.email || extra.email };
}

async function cnpjWs(cnpj: string): Promise<RespostaCnpjWs | null> {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as RespostaCnpjWs | null;
}

export async function buscarCnpj(cnpj: string): Promise<EmpresaEncontrada | "nao-achou" | "falhou"> {
  const [res, ws] = await Promise.all([
    fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(15_000) }).catch(() => null),
    cnpjWs(cnpj),
  ]);
  if (res?.ok) {
    const base = await res.json().catch(() => null);
    if (base) return completarContato(empresaDoCnpj(base as RespostaCnpj), ws ? contatoDoCnpjWs(ws) : null);
  }
  if (ws?.estabelecimento) return empresaDoCnpjWs(ws);
  if (res?.status === 404 || res?.status === 400) return "nao-achou";
  return "falhou";
}

export async function buscarCep(cep: string): Promise<{ endereco: string; cidadeUf: string } | null> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res?.ok) return null;
  return enderecoDoCep((await res.json()) as RespostaCep);
}
