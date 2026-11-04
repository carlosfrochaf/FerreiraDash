import {
  CalendarClock,
  FileSignature,
  HandCoins,
  History,
  Home,
  PlusCircle,
  Settings2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = { href: string; label: string; icon: LucideIcon };
export type SecaoMenu = { titulo?: string; itens: ItemMenu[] };

/** Menu lateral (computador), por setor. */
export const SECOES: SecaoMenu[] = [
  { itens: [{ href: "/", label: "Início", icon: Home }] },
  { itens: [{ href: "/clientes", label: "Clientes", icon: Users }] },
  {
    titulo: "Financeiro",
    itens: [
      { href: "/lancamentos/novo", label: "Lançar", icon: PlusCircle },
      { href: "/recebimentos", label: "Recebimentos", icon: HandCoins },
      { href: "/despesas", label: "Despesas", icon: Wallet },
      { href: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    titulo: "Advogados",
    itens: [
      { href: "/audiencias", label: "Audiências", icon: CalendarClock },
      { href: "/peticoes", label: "Petições", icon: FileSignature },
    ],
  },
  { titulo: "Ajustes", itens: [{ href: "/categorias", label: "Categorias e ajustes", icon: Settings2 }] },
];

/** Barra de baixo (celular); o resto fica no "Mais". */
export const BARRA_CELULAR = ["/", "/clientes", "/lancamentos/novo", "/recebimentos"];

export function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
