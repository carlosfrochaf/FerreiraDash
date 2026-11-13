// Resumo semanal do dono e aviso de ficha parada. Puro.
import { brl, type Notificacao } from "./notificacoes";

export function ehSegunda(data: string): boolean {
  return new Date(`${data}T12:00:00Z`).getUTCDay() === 1;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function montarResumoSemanal(d: { contratos: number; fichasSemAdvogado: number; peticoes: number; entrou: number }): Notificacao | null {
  const partes = [
    d.contratos ? plural(d.contratos, "contrato assinado", "contratos assinados") : "",
    d.peticoes ? plural(d.peticoes, "petição entregue", "petições entregues") : "",
    d.entrou > 0 ? `${brl(d.entrou)} entrou` : "",
    d.fichasSemAdvogado ? plural(d.fichasSemAdvogado, "ficha sem advogado", "fichas sem advogado") : "",
  ].filter(Boolean);
  if (partes.length === 0) return null;
  return { title: "Resumo da semana", body: partes.join(" · "), url: "/", tag: "resumo-semana" };
}

function dias(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

export type FichaEnviada = { id: string; clienteId: string; clienteNome: string; empresa: string | null; advogadoChave: string | null; enviadaEm: string };

/**
 * Fichas enviadas ao advogado há `limite` dias ou mais sem petição do cliente depois do envio.
 * Avisa só no 7º, 14º, 21º... dia para não repetir todo dia.
 */
export function fichasParadas(fichas: FichaEnviada[], peticoes: { clienteId: string; criadaEm: string }[], hoje: string, limite = 7): (FichaEnviada & { dias: number })[] {
  return fichas
    .map((f) => ({ ...f, dias: dias(f.enviadaEm, hoje) }))
    .filter((f) => f.dias >= limite && (f.dias - limite) % 7 === 0)
    .filter((f) => !peticoes.some((p) => p.clienteId === f.clienteId && p.criadaEm >= f.enviadaEm));
}
