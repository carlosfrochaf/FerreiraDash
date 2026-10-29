import Link from "next/link";
import { Gavel, Receipt } from "lucide-react";

const acoes = [
  {
    href: "/lancamentos/novo?modo=causa",
    titulo: "Nova causa",
    texto: "Valor, % e parcelas",
    icon: Gavel,
    estilo: "bg-primary text-primary-foreground hover:bg-primary/90",
    iconeEstilo: "bg-black/10",
  },
  {
    href: "/lancamentos/novo?modo=simples",
    titulo: "Despesa ou entrada",
    texto: "Lançamento avulso",
    icon: Receipt,
    estilo: "border border-border bg-card hover:bg-accent",
    iconeEstilo: "bg-primary/10 text-primary",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {acoes.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`flex items-center gap-3 rounded-2xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 ${a.estilo}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconeEstilo}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{a.titulo}</span>
              <span className="block truncate text-xs opacity-75">{a.texto}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
