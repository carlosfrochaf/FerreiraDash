"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  data: { mes: string; entradas: number; saidas: number }[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
              <span className="flex items-center gap-2 text-foreground font-medium">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ backgroundColor: entry.fill }} 
                />
                {entry.name}
              </span>
              <span className="font-semibold" style={{ color: entry.fill }}>
                {formatCurrency(Number(entry.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function CashFlowChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v) =>
                new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[6, 6, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#fb7185" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
