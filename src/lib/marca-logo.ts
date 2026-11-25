// Logotipo do escritório como data URL, para gerar os ícones na publicação.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARCA } from "./marca";

async function doLink(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const tipo = res.headers.get("content-type") ?? "";
    if (!res.ok || !tipo.startsWith("image/")) return null;
    return `data:${tipo.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Logo da configuração; se não houver ou falhar, o ícone que vem com o app. */
export async function logoComoDataUrl(): Promise<string> {
  const doEscritorio = MARCA.logoUrl ? await doLink(MARCA.logoUrl) : null;
  if (doEscritorio) return doEscritorio;
  if (MARCA.logoUrl) console.warn("[marca] não deu para baixar o logotipo; usando o ícone padrão.");
  const arquivo = await readFile(path.join(process.cwd(), "public", "icon.png"));
  return `data:image/png;base64,${arquivo.toString("base64")}`;
}
