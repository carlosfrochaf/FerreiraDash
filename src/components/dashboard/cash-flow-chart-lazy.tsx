"use client";

import dynamic from "next/dynamic";

// O Recharts é a biblioteca mais pesada da página: carrega depois do resto.
export const CashFlowChartLazy = dynamic(
  () => import("./cash-flow-chart").then((m) => m.CashFlowChart),
  {
    ssr: false,
    loading: () => <div className="h-[22rem] animate-pulse rounded-2xl border border-border bg-card" />,
  }
);
