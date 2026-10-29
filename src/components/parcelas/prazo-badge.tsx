import { cn } from "@/lib/utils";
import { diasAte } from "@/lib/datas";

/** Selo de prazo: "Atrasada 3d", "Vence hoje", "Em 2 dias". Some quando falta mais de 7 dias. */
export function PrazoBadge({ vencimento, className }: { vencimento: string; className?: string }) {
  const dias = diasAte(vencimento);
  if (dias > 7) return null;

  const texto = dias < 0 ? `Atrasada ${-dias}d` : dias === 0 ? "Vence hoje" : dias === 1 ? "Amanhã" : `Em ${dias} dias`;
  const cor =
    dias <= 0
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/30"
      : dias <= 3
        ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
        : "bg-sky-500/10 text-sky-300 ring-sky-500/20";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        cor,
        className
      )}
    >
      {texto}
    </span>
  );
}
