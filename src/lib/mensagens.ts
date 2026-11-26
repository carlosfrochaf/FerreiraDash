// Mensagens prontas de WhatsApp. Puro: usado na tela e no servidor.
import { linkWhatsApp } from "./clientes";

export type Momento = "ANTES_CONTRATO" | "DEPOIS_CONTRATO" | "AUDIENCIA" | "SEMPRE";

export const MOMENTOS: { valor: Momento; rotulo: string }[] = [
  { valor: "ANTES_CONTRATO", rotulo: "Antes do contrato" },
  { valor: "DEPOIS_CONTRATO", rotulo: "Depois do contrato" },
  { valor: "AUDIENCIA", rotulo: "Quando houver audiência" },
  { valor: "SEMPRE", rotulo: "Sempre" },
];

export const MARCAS = [
  { marca: "{nome}", ajuda: "primeiro nome do cliente" },
  { marca: "{escritorio}", ajuda: "nome do escritório" },
  { marca: "{faltam}", ajuda: "RG, comprovante e empresa que faltam" },
  { marca: "{provas}", ajuda: "provas marcadas na hora" },
  { marca: "{audiencia}", ajuda: "data e hora da próxima audiência" },
];

/** Provas que a secretária pode marcar para pedir (depende do caso). */
export const PROVAS = [
  "Prints de conversas",
  "Comprovantes Pix",
  "Áudios",
  "Vídeos",
  "Fotos",
  "Fotos do uniforme",
  "TRCT",
  "Holerites",
  "Extrato do FGTS",
  "Cartão de ponto",
  "Atestados / laudos",
  "Contatos das testemunhas",
];

/** Mensagens que o app já traz (o fluxo do Ferreira & Rocha). Cada escritório muda à vontade. */
export const MODELOS_PADRAO: { nome: string; momento: Momento; texto: string }[] = [
  {
    nome: "Documentos para o contrato",
    momento: "ANTES_CONTRATO",
    texto:
      "Olá, {nome}! Aqui é do escritório {escritorio}. Para prepararmos seu contrato, precisamos de:\n{faltam}\nE uma pergunta: você tem alguma prova, como prints de conversas, comprovantes Pix, áudios, vídeos ou fotos? Só nos conte o que tem, não precisa mandar agora.",
  },
  {
    nome: "Pedir as provas",
    momento: "DEPOIS_CONTRATO",
    texto: "Olá, {nome}! Seu contrato está assinado. Agora, por favor, nos envie:\n{provas}\nPode mandar por aqui mesmo. Obrigado!",
  },
  {
    nome: "Audiência",
    momento: "AUDIENCIA",
    texto: "Olá, {nome}! Lembrando da sua audiência {audiencia}. Chegue com 30 minutos de antecedência e leve um documento com foto. Qualquer dúvida, fale com a gente. {escritorio}",
  },
];

export function faltamParaContrato(c: { temRg: boolean; temComprovante: boolean; empresa: string | null | undefined }): string[] {
  const l: string[] = [];
  if (!c.temRg) l.push("Foto do RG ou CNH (frente e verso)");
  if (!c.temComprovante) l.push("Comprovante de endereço");
  if (!c.empresa?.trim()) l.push("Nome da empresa onde trabalhou");
  return l;
}

type Valores = { nome: string; escritorio: string; faltam?: string[]; provas?: string[]; audiencia?: string };

/** Troca as marcas pelo conteúdo. Listas viram linhas com "•"; lista vazia some com a linha. */
export function preencher(texto: string, v: Valores): string {
  const lista = (l: string[] | undefined) => (l ?? []).map((i) => `• ${i}`).join("\n");
  const primeiro = v.nome.trim().split(/\s+/)[0] ?? "";
  return texto
    .replace(/\{nome\}/g, primeiro)
    .replace(/\{escritorio\}/g, v.escritorio)
    .replace(/\{audiencia\}/g, v.audiencia ?? "")
    .replace(/\{faltam\}/g, lista(v.faltam))
    .replace(/\{provas\}/g, lista(v.provas))
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function modelosDoMomento<T extends { momento: Momento }>(modelos: T[], c: { temContrato: boolean; temAudiencia: boolean }): T[] {
  return modelos.filter(
    (m) => m.momento === "SEMPRE" || (m.momento === "AUDIENCIA" ? c.temAudiencia : m.momento === "DEPOIS_CONTRATO" ? c.temContrato : !c.temContrato),
  );
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function textoAudiencia(a: { data: string; hora: string | null }): string {
  const [ano, mes, dia] = a.data.split("-").map(Number);
  const semana = DIAS[new Date(Date.UTC(ano, mes - 1, dia, 12)).getUTCDay()];
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")} (${semana})${a.hora ? ` às ${a.hora}` : ""}`;
}

export function linkComTexto(telefone: string, texto: string): string | null {
  const base = linkWhatsApp(telefone);
  return base ? `${base}?text=${encodeURIComponent(texto)}` : null;
}
