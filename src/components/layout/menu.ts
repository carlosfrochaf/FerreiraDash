import {
  CalendarClock,
  FileSignature,
  HandCoins,
  History,
  Home,
  PlusCircle,
  Settings2,
  UserCog,
  Plug,
  MessageSquareText,
  Users,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { podeVerTela, type Perfil } from "@/lib/perfis";

export type ItemMenu = { href: string; label: string; icon: LucideIcon };
export type SecaoMenu = { titulo?: string; itens: ItemMenu[] };

/** Menu lateral (computador), por setor. Cada perfil vê só o que pode abrir. */
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
      { href: "/meus-pagamentos", label: "Meus pagamentos", icon: WalletCards },
    ],
  },
  {
    titulo: "Ajustes",
    itens: [
      { href: "/categorias", label: "Categorias e ajustes", icon: Settings2 },
      { href: "/usuarios", label: "Usuários", icon: UserCog },
      { href: "/mensagens", label: "Mensagens", icon: MessageSquareText },
      { href: "/integracoes", label: "Integrações", icon: Plug },
    ],
  },
];

export function secoesDoPerfil(perfil: Perfil): SecaoMenu[] {
  return SECOES.map((s) => ({
    ...s,
    // "Meus pagamentos" é só do advogado (o dono vê tudo pelo financeiro).
    itens: s.itens.filter((i) => (i.href === "/meus-pagamentos" ? perfil === "ADVOGADO" : podeVerTela(perfil, i.href))),
  })).filter((s) => s.itens.length > 0);
}

const BARRAS: Record<Perfil, string[]> = {
  DONO: ["/", "/clientes", "/lancamentos/novo", "/recebimentos"],
  FINANCEIRO: ["/", "/clientes", "/lancamentos/novo", "/recebimentos"],
  SECRETARIA: ["/", "/clientes", "/audiencias", "/peticoes"],
  ADVOGADO: ["/", "/clientes", "/peticoes", "/meus-pagamentos"],
};

/** Barra de baixo (celular); o resto fica no "Mais". */
export function barraDoPerfil(perfil: Perfil): string[] {
  return BARRAS[perfil];
}

export function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
