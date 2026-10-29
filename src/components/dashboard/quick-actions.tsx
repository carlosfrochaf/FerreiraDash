import Link from "next/link";
import { CalendarClock, FileText, Gavel, Receipt } from "lucide-react";

const acoes = [
  { href: "/lancamentos/novo?modo=causa", titulo: "Causa", icon: Gavel },
  { href: "/audiencias/nova", titulo: "Audiência", icon: CalendarClock },
  { href: "/peticoes/nova", titulo: "Petição", icon: FileText },
  { href: "/lancamentos/novo?modo=simples", titulo: "Outro", icon: Receipt },
];

/** Atalhos discretos para cadastrar. */
export function QuickActions() {
  return (
    <nav aria-label="Cadastrar" className="grid grid-cols-4 gap-2">
      {acoes.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{a.titulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
