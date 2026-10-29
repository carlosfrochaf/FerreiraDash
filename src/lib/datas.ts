// Datas "puras" (sem hora), no formato "AAAA-MM-DD".
// Colunas @db.Date são lidas/gravadas como meia-noite UTC.

export const FUSO_ESCRITORIO = "America/Sao_Paulo";

/** Data de hoje no fuso de Brasília, "AAAA-MM-DD". */
export function hojeSaoPaulo(agora: Date = new Date()): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: FUSO_ESCRITORIO });
}

/** "AAAA-MM-DD" → Date para gravar numa coluna @db.Date. */
export function dataParaDb(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

/** Date lida de uma coluna @db.Date → "AAAA-MM-DD". */
export function dataDoDb(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * "AAAA-MM-DD" → Date local (meia-noite no fuso do navegador).
 * Evita o bug de `new Date("2026-11-20")`, que é lido como UTC e mostra 19/11 no Brasil.
 */
export function dataLocal(data: string): Date {
  const [a, m, d] = data.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11-20" → "20/11/2026" */
export function formatarData(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-11-20" → "20 nov 2026" */
export function formatarDataCurta(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d} ${MESES_CURTOS[Number(m) - 1]} ${a}`;
}

/** Dias de hoje (fuso de Brasília) até a data. Negativo = atrasado. */
export function diasAte(data: string, hoje: string = hojeSaoPaulo()): number {
  return Math.round((dataParaDb(data.slice(0, 10)).getTime() - dataParaDb(hoje).getTime()) / 86_400_000);
}

export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = dataParaDb(data);
  return !Number.isNaN(d.getTime()) && dataDoDb(d) === data;
}
