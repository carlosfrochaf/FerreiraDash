// No navegador: envia um documento em três passos (pede o link, manda o arquivo direto ao Storage, registra).

export type CamposDocumento = { clienteId: string; tipo?: string; recebimentoId?: string | null; peticaoId?: string | null };

async function erroDe(res: Response | null, padrao: string): Promise<Error> {
  const d = await res?.json().catch(() => ({}));
  return new Error(typeof d?.error === "string" ? d.error : padrao);
}

/** Devolve o id do documento criado; lança Error com mensagem para mostrar. */
export async function enviarDocumento(arquivo: File, campos: CamposDocumento): Promise<string> {
  const falha = `${arquivo.name}: não foi enviado.`;
  const r1 = await fetch("/api/documentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...campos, nome: arquivo.name, mime: arquivo.type, tamanho: arquivo.size }),
  }).catch(() => null);
  if (!r1?.ok) throw await erroDe(r1, falha);
  const { uploadUrl, ticket } = (await r1.json()) as { uploadUrl: string; ticket: string };

  const r2 = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": arquivo.type, "x-upsert": "false" }, body: arquivo }).catch(() => null);
  if (!r2?.ok) throw new Error(falha);

  const r3 = await fetch("/api/documentos/confirmar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket }),
  }).catch(() => null);
  if (!r3?.ok) throw await erroDe(r3, falha);
  return ((await r3.json()) as { id: string }).id;
}
