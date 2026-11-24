import { formatCurrency } from "@/lib/utils";

type Props = {
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
  aRepassarClientes: number;
  aReceberEscritorio: number;
};

/** Destaque do início: o saldo do escritório e três números do mês. */
export function ResumoHero({ saldoAtual, entradasMes, saidasMes, aRepassarClientes, aReceberEscritorio }: Props) {
  const itens = [
    { label: "Entrou no mês", valor: entradasMes, cor: "text-emerald-300" },
    { label: "Saiu no mês", valor: saidasMes, cor: "text-rose-300" },
    { label: "A repassar", valor: aRepassarClientes, cor: "text-amber-200" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-[hsl(218_57%_20%)] via-[hsl(222_45%_12%)] to-card p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Saldo do escritório</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${saldoAtual < 0 ? "text-rose-300" : ""}`}>
        {formatCurrency(saldoAtual)}
      </p>
      {aReceberEscritorio > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          + {formatCurrency(aReceberEscritorio)} ainda a receber das empresas
        </p>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-primary/15 pt-4">
        {itens.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="truncate text-[11px] text-muted-foreground sm:text-xs">{i.label}</dt>
            <dd className={`truncate text-sm font-semibold tabular-nums sm:text-base ${i.cor}`}>{formatCurrency(i.valor)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
