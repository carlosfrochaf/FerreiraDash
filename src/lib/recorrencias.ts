// Regra das despesas que se repetem todo mês. Puro: não acessa o banco.
// Datas em "AAAA-MM-DD"; meses em "AAAA-MM".

/** "2026-10-31" → "2026-10". */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

/** "2026-12" → "2027-01". */
export function proximoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, "0")}`;
}

/** Vencimento no mês, limitado ao último dia dele (31 em novembro → 30). */
export function vencimentoNoMes(mes: string, dia: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}`;
}

/**
 * Vencimentos a lançar: um por mês, depois de `ultimoMes` até o mês de `hoje`.
 * Normalmente só um; mais de um se o disparo ficou meses sem rodar.
 */
export function mesesQueFaltam(
  r: { ativa: boolean; ultimoMes: string; diaVencimento: number },
  hoje: string
): string[] {
  if (!r.ativa) return [];
  const atual = mesDe(hoje);
  const out: string[] = [];
  for (let mes = proximoMes(r.ultimoMes); mes <= atual; mes = proximoMes(mes)) {
    out.push(vencimentoNoMes(mes, r.diaVencimento));
  }
  return out;
}
