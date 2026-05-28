import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
};

export function SummaryCards({ saldoAtual, entradasMes, saidasMes }: Props) {
  const cards = [
    {
      label: "Saldo Atual",
      value: saldoAtual,
      icon: Wallet,
      accent: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Entradas do Mês",
      value: entradasMes,
      icon: TrendingUp,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Saídas do Mês",
      value: saidasMes,
      icon: TrendingDown,
      accent: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-border/80">
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{formatCurrency(card.value)}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
