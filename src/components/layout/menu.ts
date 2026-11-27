import {
  CalendarClock,
  FileSignature,
  HandCoins,
  History,
  Home,
  MessageSquareText,
  PenLine,
  PlusCircle,
  Scale,
  Settings2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = { href: string; label: string; icon: LucideIcon };
export type SecaoMenu = { titulo?: string; itens: ItemMenu[] };

/** Menu lateral (computador), por setor. Senha única: todo mundo vê tudo. */
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
      { href: "/intimacoes", label: "Intimações", icon: Scale },
      { href: "/audiencias", label: "Audiências", icon: CalendarClock },
      { href: "/peticoes", label: "Petições", icon: FileSignature },
      { href: "/contratos", label: "Contratos", icon: PenLine },
    ],
  },
  {
    titulo: "Ajustes",
    itens: [
      { href: "/categorias", label: "Categorias e ajustes", icon: Settings2 },
      { href: "/mensagens", label: "Mensagens", icon: MessageSquareText },
    ],
  },
];

/** Barra de baixo (celular); o resto fica no "Mais". */
export const BARRA = ["/", "/clientes", "/lancamentos/novo", "/recebimentos"];

export function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
