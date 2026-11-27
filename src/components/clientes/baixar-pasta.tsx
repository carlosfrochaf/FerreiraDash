"use client";

import { useState } from "react";
import { FolderDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nomeSeguro } from "@/lib/pasta-cliente";

type Pasta = { nome: string; arquivos: { caminhoNoZip: string; url: string }[]; fichas: { id: string; empresa: string | null }[] };
type Arquivo = { caminho: string; conteudo: Blob };

// Chrome/Edge no computador deixam o site gravar numa pasta escolhida pela pessoa.
type PastaDoPc = {
  getDirectoryHandle(nome: string, o: { create: boolean }): Promise<PastaDoPc>;
  getFileHandle(nome: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>;
};
type ComEscolhaDePasta = Window & { showDirectoryPicker?: (o?: { mode?: "readwrite"; id?: string }) => Promise<PastaDoPc> };

async function juntarArquivos(clienteId: string): Promise<{ nome: string; arquivos: Arquivo[] }> {
  const res = await fetch(`/api/clientes/${clienteId}/pasta`);
  if (!res.ok) throw new Error();
  const p: Pasta = await res.json();
  const docs = p.arquivos.map(async (a) => {
    const r = await fetch(a.url);
    if (!r.ok) throw new Error();
    return { caminho: a.caminhoNoZip, conteudo: await r.blob() };
  });
  const fichas = p.fichas.map(async (f, i) => {
    const r = await fetch(`/api/fichas/${f.id}/word`);
    if (!r.ok) throw new Error();
    const sufixo = f.empresa ? ` x ${f.empresa}` : p.fichas.length > 1 ? ` ${i + 1}` : "";
    return { caminho: nomeSeguro(`Ficha - ${p.nome}${sufixo}`) + ".docx", conteudo: await r.blob() };
  });
  return { nome: nomeSeguro(p.nome), arquivos: await Promise.all([...docs, ...fichas]) };
}

/** Grava a pasta do cliente (com subpastas) dentro da pasta escolhida, por exemplo a do Google Drive. */
async function gravarNaPasta(destino: PastaDoPc, nome: string, arquivos: Arquivo[]) {
  const raiz = await destino.getDirectoryHandle(nome, { create: true });
  for (const a of arquivos) {
    const partes = a.caminho.split("/");
    let pasta = raiz;
    for (const sub of partes.slice(0, -1)) pasta = await pasta.getDirectoryHandle(sub, { create: true });
    const arq = await pasta.getFileHandle(partes[partes.length - 1], { create: true });
    const w = await arq.createWritable();
    await w.write(a.conteudo);
    await w.close();
  }
}

async function baixarZip(nome: string, arquivos: Arquivo[]) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const raiz = zip.folder(nome)!;
  for (const a of arquivos) raiz.file(a.caminho, a.conteudo);
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${nome}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

/**
 * Computador (Chrome/Edge): escolhe a pasta (ex.: a do Google Drive) e a pasta do cliente é criada lá, com subpastas.
 * Celular e outros navegadores: baixa um .zip.
 */
export function BaixarPasta({ clienteId }: { clienteId: string }) {
  const [estado, setEstado] = useState<"" | "baixando" | "ok" | "erro">("");

  async function baixar() {
    const escolher = (window as ComEscolhaDePasta).showDirectoryPicker;
    let destino: PastaDoPc | null = null;
    if (escolher) {
      try {
        // "id" faz o Chrome abrir já na última pasta usada (a do Drive, depois da primeira vez).
        destino = await escolher({ mode: "readwrite", id: "pasta-clientes" });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // fechou a janela
        destino = null;
      }
    }
    setEstado("baixando");
    try {
      const { nome, arquivos } = await juntarArquivos(clienteId);
      if (destino) await gravarNaPasta(destino, nome, arquivos);
      else await baixarZip(nome, arquivos);
      setEstado("ok");
      setTimeout(() => setEstado(""), 4000);
    } catch {
      setEstado("erro");
    }
  }

  const rotulo = { "": "Baixar pasta", baixando: "Preparando…", ok: "Pasta salva", erro: "Falhou, tentar de novo" }[estado];
  return (
    <Button variant="outline" size="sm" onClick={baixar} disabled={estado === "baixando"} title="Ficha, documentos e provas numa pasta">
      {estado === "baixando" ? <Loader2 className="animate-spin" /> : <FolderDown />}
      {rotulo}
    </Button>
  );
}
