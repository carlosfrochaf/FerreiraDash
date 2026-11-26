// Áudio do WhatsApp → texto, pela OpenAI. Só no servidor.
import OpenAI, { toFile } from "openai";

export const transcricaoConfigurada = () => !!process.env.OPENAI_API_KEY;

/** Limite da OpenAI por arquivo. */
export const TAMANHO_MAXIMO_AUDIO = 25 * 1024 * 1024;

const TIPOS: Record<string, { ext: string; mime: string }> = {
  // O .opus do WhatsApp é um Ogg com Opus dentro; a OpenAI aceita como .ogg.
  opus: { ext: "ogg", mime: "audio/ogg" },
  ogg: { ext: "ogg", mime: "audio/ogg" },
  oga: { ext: "ogg", mime: "audio/ogg" },
  m4a: { ext: "m4a", mime: "audio/mp4" },
  mp3: { ext: "mp3", mime: "audio/mpeg" },
  wav: { ext: "wav", mime: "audio/wav" },
};

export class ErroTranscricao extends Error {
  constructor(message: string, public status: 400 | 413 | 502 | 503 = 400) {
    super(message);
  }
}

export async function transcreverAudio(nome: string, conteudo: ArrayBuffer): Promise<string> {
  if (!transcricaoConfigurada()) throw new ErroTranscricao("A leitura de áudios ainda não está ativada neste app.", 503);
  const tipo = TIPOS[nome.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipo) throw new ErroTranscricao("Formato de áudio não aceito.");
  if (conteudo.byteLength === 0) throw new ErroTranscricao("Áudio vazio.");
  if (conteudo.byteLength > TAMANHO_MAXIMO_AUDIO) throw new ErroTranscricao("Áudio grande demais.", 413);

  const client = new OpenAI();
  try {
    const r = await client.audio.transcriptions.create({
      file: await toFile(Buffer.from(conteudo), `audio.${tipo.ext}`, { type: tipo.mime }),
      model: "gpt-4o-transcribe",
      language: "pt",
    });
    return r.text.trim();
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) throw new ErroTranscricao("O serviço de áudio está ocupado. Tente de novo em um minuto.", 503);
    if (err instanceof OpenAI.AuthenticationError) {
      console.error("[transcricao] chave recusada");
      throw new ErroTranscricao("A leitura de áudios não está configurada direito (chave).", 503);
    }
    console.error("[transcricao] falha", err);
    throw new ErroTranscricao("Não consegui transcrever esse áudio.", 502);
  }
}
