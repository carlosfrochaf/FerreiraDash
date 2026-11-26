// Áudios da conversa exportada do WhatsApp: quais são e como o texto deles entra na conversa. Puro.

const EXTENSOES_AUDIO = /\.(opus|ogg|m4a|mp3|aac|amr|wav|oga)$/i;

export const ehAudio = (nome: string) => EXTENSOES_AUDIO.test(nome);

/** Nome do arquivo anexado (Android: "X (arquivo anexado)"; iPhone: "<anexado: X>"). */
const ANEXO = /<(?:anexado|attached):\s*([^>]+?)>|([^\s:<>]+\.\w{2,4}) \((?:arquivo anexado|file attached)\)/g;

/** Áudios citados na conversa, na ordem em que aparecem. */
export function audiosCitados(texto: string): string[] {
  const out: string[] = [];
  for (const m of texto.matchAll(ANEXO)) {
    const nome = (m[1] ?? m[2]).trim();
    if (ehAudio(nome) && !out.includes(nome)) out.push(nome);
  }
  return out;
}

/** Troca cada áudio anexado pelo texto dele. Áudio sem texto fica como "[áudio não transcrito]". */
export function juntarTranscricoes(texto: string, transcricoes: Record<string, string>): string {
  return texto.replace(ANEXO, (inteiro, a?: string, b?: string) => {
    const nome = (a ?? b ?? "").trim();
    if (!ehAudio(nome)) return inteiro;
    const t = transcricoes[nome]?.replace(/\s+/g, " ").trim();
    return t ? `[áudio] ${t}` : "[áudio não transcrito]";
  });
}
