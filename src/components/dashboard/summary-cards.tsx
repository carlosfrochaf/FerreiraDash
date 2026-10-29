import { HandCoins, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
  aRepassarClientes: number;
  aReceberEscritorio: number;
};

export function SummaryCards({ saldoAtual, entradasMes, saidasMes, aRepassarClientes, aReceberEscritorio }: Props) {
  const cards = [
    {
      label: "Saldo do escritório",
      value: saldoAtual,
      hint: `${formatCurrency(aReceberEscritorio)} ainda a receber`,
      icon: Wallet,
      accent: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Entradas do mês",
      value: entradasMes,
      hint: "Parte do escritório",
      icon: TrendingUp,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Saídas do mês",
      value: saidasMes,
      hint: "Despesas e audiências pagas",
      icon: TrendingDown,
      accent: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "A repassar a clientes",
      value: aRepassarClientes,
      hint: "Já recebido, não é do escritório",
      icon: HandCoins,
      accent: "text-amber-300",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="space-y-2 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">{card.label}</p>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </div>
              </div>
              <p className="text-lg font-bold tabular-nums tracking-tight sm:text-2xl">{formatCurrency(card.value)}</p>
              <p className="truncate text-[11px] text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
