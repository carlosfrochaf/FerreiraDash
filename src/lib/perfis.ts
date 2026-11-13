// Quem pode ver e fazer o quê. Puro: usado no middleware (edge), no servidor e no navegador.

export type Perfil = "DONO" | "FINANCEIRO" | "SECRETARIA" | "ADVOGADO";

export const PERFIS: Perfil[] = ["DONO", "FINANCEIRO", "SECRETARIA", "ADVOGADO"];

const ROTULOS: Record<Perfil, string> = {
  DONO: "Dono/Sócio",
  FINANCEIRO: "Financeiro",
  SECRETARIA: "Secretária",
  ADVOGADO: "Advogado",
};

export function rotuloPerfil(p: Perfil): string {
  return ROTULOS[p];
}

export function ehPerfil(v: unknown): v is Perfil {
  return typeof v === "string" && (PERFIS as string[]).includes(v);
}

const TODOS = PERFIS;
const FIN: Perfil[] = ["DONO", "FINANCEIRO"];
const ESCRITORIO: Perfil[] = ["DONO", "FINANCEIRO", "SECRETARIA"];
const CADASTRO: Perfil[] = ["DONO", "SECRETARIA"];

/** Telas por prefixo. Vale o prefixo mais longo que casar; o que não estiver aqui é só do dono. */
const TELAS: [string, Perfil[]][] = [
  ["/", TODOS],
  ["/clientes", TODOS],
  ["/clientes/novo", CADASTRO],
  ["/lancamentos", FIN],
  ["/despesas", FIN],
  ["/historico", FIN],
  ["/recebimentos", FIN],
  ["/categorias", FIN],
  ["/audiencias", TODOS],
  ["/peticoes", TODOS],
  ["/meus-pagamentos", ["ADVOGADO"]],
  ["/usuarios", ["DONO"]],
];

/** Rotas da API: [prefixo, quem lê (GET), quem escreve]. */
const APIS: [string, Perfil[], Perfil[]][] = [
  // O advogado só alcança os clientes dele: as rotas conferem com `filtroClientesDoUsuario`.
  ["/api/clientes", TODOS, CADASTRO],
  ["/api/documentos", TODOS, ["DONO", "SECRETARIA", "ADVOGADO"]],
  ["/api/fichas", TODOS, ["DONO", "SECRETARIA", "ADVOGADO"]],
  ["/api/transacoes", FIN, FIN],
  ["/api/recebimentos", FIN, FIN],
  ["/api/parcelas", FIN, FIN],
  ["/api/recorrencias", FIN, FIN],
  ["/api/categorias", FIN, FIN],
  ["/api/audiencias", TODOS, ESCRITORIO],
  ["/api/peticoes", TODOS, ESCRITORIO],
  ["/api/usuarios", ["DONO"], ["DONO"]],
  ["/api/integracoes", ["DONO"], ["DONO"]],
  ["/api/push/subscribe", TODOS, TODOS],
  ["/api/login", TODOS, TODOS],
];

function casa(pathname: string, prefixo: string): boolean {
  if (prefixo === "/") return pathname === "/";
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`);
}

function maisLongo<T extends [string, ...unknown[]]>(lista: T[], pathname: string): T | undefined {
  return lista.filter((r) => casa(pathname, r[0])).sort((a, b) => b[0].length - a[0].length)[0];
}

/** Telas de criar e editar audiência/petição não são do advogado (ele só vê as listas). */
function ehEdicaoDeAdvogado(pathname: string): boolean {
  return /^\/(audiencias|peticoes)\/.+/.test(pathname);
}

export function podeVerTela(perfil: Perfil, pathname: string): boolean {
  if (perfil === "DONO") return true;
  if (perfil === "ADVOGADO" && ehEdicaoDeAdvogado(pathname)) return false;
  const regra = maisLongo(TELAS, pathname);
  return !!regra && regra[1].includes(perfil);
}

export function podeUsarApi(perfil: Perfil, metodo: string, pathname: string): boolean {
  if (perfil === "DONO") return true;
  const regra = maisLongo(APIS, pathname);
  if (!regra) return false;
  return (metodo.toUpperCase() === "GET" ? regra[1] : regra[2]).includes(perfil);
}

/** Secretária não vê valores em dinheiro. */
export const veValores = (p: Perfil) => p !== "SECRETARIA";
export const editaClientes = (p: Perfil) => CADASTRO.includes(p);
export const soDoAdvogado = (p: Perfil) => p === "ADVOGADO";
