// Marca de cada cópia do app (nome, subtítulo, cor, logotipo), vinda da configuração da Vercel. Puro.

const PADRAO = { nome: "Ferreira & Rocha", subtitulo: "Financeiro Jurídico", cor: "#D7B340" };
const TEXTO_ESCURO = "hsl(222 47% 7%)";
const TEXTO_CLARO = "hsl(0 0% 100%)";

function hexParaHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslParaRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

/** Luminância relativa (WCAG) de uma cor RGB entre 0 e 1. */
function luminancia([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Luminância dos dois textos possíveis: hsl(222 47% 7%) e branco.
const LUM_ESCURO = luminancia(hslParaRgb(222, 47, 7));
const contraste = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Escuro ou branco: o que der mais contraste (WCAG) com a cor do botão. */
function textoDeMaiorContraste(lumCor: number): string {
  return contraste(lumCor, LUM_ESCURO) >= contraste(lumCor, 1) ? TEXTO_ESCURO : TEXTO_CLARO;
}

/** Cor de destaque legível no fundo escuro e a cor do texto por cima dela. */
export function corDaMarca(hex: string | undefined): { cor: string; texto: string } {
  const valido = hex && /^#[0-9a-fA-F]{6}$/.test(hex.trim()) ? hex.trim() : PADRAO.cor;
  let [h, s, l] = hexParaHsl(valido).map(Math.round) as [number, number, number];
  if (l < 45) l = 55;
  if (h === 360) h = 0;
  return {
    cor: `hsl(${h} ${s}% ${l}%)`,
    texto: textoDeMaiorContraste(luminancia(hslParaRgb(h, s, l))),
  };
}

export type Marca = { nome: string; subtitulo: string; cor: string; texto: string; logoUrl: string | null };

export function marcaDoAmbiente(env: Record<string, string | undefined>): Marca {
  const limpo = (v: string | undefined) => v?.trim() || null;
  return {
    nome: limpo(env.NEXT_PUBLIC_ESCRITORIO_NOME) ?? PADRAO.nome,
    subtitulo: limpo(env.NEXT_PUBLIC_ESCRITORIO_SUBTITULO) ?? PADRAO.subtitulo,
    ...corDaMarca(limpo(env.NEXT_PUBLIC_ESCRITORIO_COR) ?? undefined),
    logoUrl: limpo(env.ESCRITORIO_LOGO_URL),
  };
}

// O Next só embute no navegador as variáveis NEXT_PUBLIC_ escritas por extenso.
export const MARCA: Marca = marcaDoAmbiente({
  NEXT_PUBLIC_ESCRITORIO_NOME: process.env.NEXT_PUBLIC_ESCRITORIO_NOME,
  NEXT_PUBLIC_ESCRITORIO_SUBTITULO: process.env.NEXT_PUBLIC_ESCRITORIO_SUBTITULO,
  NEXT_PUBLIC_ESCRITORIO_COR: process.env.NEXT_PUBLIC_ESCRITORIO_COR,
  ESCRITORIO_LOGO_URL: typeof window === "undefined" ? process.env.ESCRITORIO_LOGO_URL : undefined,
});
