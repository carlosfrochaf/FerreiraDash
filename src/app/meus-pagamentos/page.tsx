import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/usuario-atual";
import { filtroDoUsuario } from "@/lib/acesso-dados";
import { resumoPagamentos } from "@/lib/meus-pagamentos";
import { dataDoDb, formatarDataCurta } from "@/lib/datas";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Linha = { id: string; tipo: string; titulo: string; data: string; valor: number | null; pago: boolean; pagoEm: string | null };

export default async function MeusPagamentosPage() {
  const eu = await usuarioAtual();
  const onde = filtroDoUsuario(eu);
  const [aud, pet] = await Promise.all([
    prisma.audiencia.findMany({ where: onde, orderBy: { data: "desc" }, take: 300 }),
    prisma.peticao.findMany({ where: onde, orderBy: { dataEntrega: "desc" }, take: 300 }),
  ]);
  const linhas: Linha[] = [
    ...aud.map((a) => ({
      id: a.id,
      tipo: "Audiência",
      titulo: `${a.clienteNome}${a.reclamada ? ` × ${a.reclamada}` : ""}`,
      data: dataDoDb(a.data),
      valor: a.valor ? Number(a.valor) : null,
      pago: a.statusPagamento === "PAGO",
      pagoEm: a.dataPagamento ? dataDoDb(a.dataPagamento) : null,
    })),
    ...pet.map((p) => ({
      id: p.id,
      tipo: "Petição",
      titulo: `${p.descricao} · ${p.clienteNome}`,
      data: dataDoDb(p.dataEntrega),
      valor: p.valor ? Number(p.valor) : null,
      pago: p.status === "PAGA",
      pagoEm: p.dataPagamento ? dataDoDb(p.dataPagamento) : null,
    })),
  ].sort((x, y) => y.data.localeCompare(x.data));
  const r = resumoPagamentos(linhas);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Meus pagamentos</h1>
        <p className="text-sm text-muted-foreground">O que você já recebeu e o que ainda vai receber do escritório.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Já recebido</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-400">{formatCurrency(r.recebido)}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A receber</p>
          <p className="text-2xl font-bold tabular-nums text-amber-300">{formatCurrency(r.aReceber)}</p>
          {r.semValor > 0 && <p className="text-xs text-muted-foreground">+ {r.semValor} ainda sem valor definido</p>}
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {eu.advogadoChave ? "Nenhuma audiência ou petição no seu nome ainda." : "Seu login ainda não está ligado a um advogado. Peça ao dono do escritório."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
          {linhas.map((l) => (
            <li key={`${l.tipo}-${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {l.tipo} · {formatarDataCurta(l.data)}
                  {l.pagoEm ? ` · pago em ${formatarDataCurta(l.pagoEm)}` : ""}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${l.pago ? "text-emerald-400" : l.valor ? "text-amber-300" : "text-muted-foreground"}`}>
                {l.valor ? formatCurrency(l.valor) : "sem valor"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
