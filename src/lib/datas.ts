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

export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = dataParaDb(data);
  return !Number.isNaN(d.getTime()) && dataDoDb(d) === data;
}
