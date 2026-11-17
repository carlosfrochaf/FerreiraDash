// Arquivos no Supabase Storage (bucket privado "documentos"), pela API REST.
// Só no servidor: usa a chave de serviço (SUPABASE_SERVICE_ROLE_KEY), que nunca vai para o navegador.

const BUCKET = "documentos";

function cfg() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Armazenamento de documentos não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return { base: `${url}/storage/v1`, headers: { Authorization: `Bearer ${chave}`, apikey: chave } };
}

export function storageConfigurado(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const caminhoUrl = (caminho: string) => caminho.split("/").map(encodeURIComponent).join("/");

async function criarBucketSeFaltar() {
  const { base, headers } = cfg();
  const res = await fetch(`${base}/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 10 * 1024 * 1024 }),
  });
  // 409/400 "already exists" é o caso normal depois da primeira vez.
  if (!res.ok && res.status !== 409 && res.status !== 400) throw new Error(`Não foi possível criar a pasta de documentos (${res.status}).`);
}

export async function enviarArquivo(caminho: string, arquivo: Blob, mime: string) {
  const { base, headers } = cfg();
  const enviar = () =>
    fetch(`${base}/object/${BUCKET}/${caminhoUrl(caminho)}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
      body: arquivo,
    });
  let res = await enviar();
  if (res.status === 404 || res.status === 400) {
    await criarBucketSeFaltar();
    res = await enviar();
  }
  if (!res.ok) throw new Error(`Falha ao guardar o arquivo (${res.status}).`);
}

/** Link para o navegador mandar o arquivo direto ao Storage (PUT, vale 2 horas, não sobrescreve). */
export async function linkDeEnvio(caminho: string): Promise<string> {
  const { base, headers } = cfg();
  const pedir = () => fetch(`${base}/object/upload/sign/${BUCKET}/${caminhoUrl(caminho)}`, { method: "POST", headers });
  let res = await pedir();
  if (res.status === 404 || res.status === 400) {
    await criarBucketSeFaltar();
    res = await pedir();
  }
  if (!res.ok) throw new Error(`Falha ao preparar o envio (${res.status}).`);
  const { url } = (await res.json()) as { url: string };
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Tamanho do arquivo guardado, ou null se ele não existe. */
export async function tamanhoGuardado(caminho: string): Promise<number | null> {
  const { base, headers } = cfg();
  const i = caminho.lastIndexOf("/");
  const res = await fetch(`${base}/object/list/${BUCKET}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: caminho.slice(0, i), search: caminho.slice(i + 1), limit: 5 }),
  });
  if (!res.ok) throw new Error(`Falha ao conferir o arquivo (${res.status}).`);
  const lista = (await res.json()) as { name: string; metadata?: { size?: number } | null }[];
  const achado = lista.find((o) => o.name === caminho.slice(i + 1));
  return achado ? Number(achado.metadata?.size ?? 0) : null;
}

/** Link temporário para abrir/baixar o arquivo. */
export async function linkAssinado(caminho: string, nomeParaBaixar?: string, segundos = 300): Promise<string> {
  const { base, headers } = cfg();
  const res = await fetch(`${base}/object/sign/${BUCKET}/${caminhoUrl(caminho)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: segundos }),
  });
  if (!res.ok) throw new Error(`Falha ao abrir o arquivo (${res.status}).`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  const url = `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
  return nomeParaBaixar ? `${url}&download=${encodeURIComponent(nomeParaBaixar)}` : url;
}

export async function apagarArquivo(caminho: string) {
  const { base, headers } = cfg();
  const res = await fetch(`${base}/object/${BUCKET}/${caminhoUrl(caminho)}`, { method: "DELETE", headers });
  if (!res.ok && res.status !== 404) throw new Error(`Falha ao apagar o arquivo (${res.status}).`);
}
