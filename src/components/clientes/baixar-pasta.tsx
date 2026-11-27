"use client";

import { useState } from "react";
import { FolderDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nomeSeguro } from "@/lib/pasta-cliente";

type Pasta = { nome: string; arquivos: { caminhoNoZip: string; url: string }[]; fichas: { id: string; empresa: string | null }[] };

/** Baixa um .zip com a ficha em Word, os documentos e as provas em subpastas, para guardar no computador ou no Drive. */
export function BaixarPasta({ clienteId }: { clienteId: string }) {
  const [estado, setEstado] = useState<"" | "baixando" | "erro">("");

  async function baixar() {
    setEstado("baixando");
    try {
      const res = await fetch(`/api/clientes/${clienteId}/pasta`);
      if (!res.ok) throw new Error();
      const p: Pasta = await res.json();
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const raiz = zip.folder(nomeSeguro(p.nome))!;
      await Promise.all(
        p.arquivos.map(async (a) => {
          const r = await fetch(a.url);
          if (!r.ok) throw new Error();
          raiz.file(a.caminhoNoZip, await r.blob());
        })
      );
      await Promise.all(
        p.fichas.map(async (f, i) => {
          const r = await fetch(`/api/fichas/${f.id}/word`);
          if (!r.ok) throw new Error();
          const sufixo = f.empresa ? ` x ${f.empresa}` : p.fichas.length > 1 ? ` ${i + 1}` : "";
          raiz.file(nomeSeguro(`Ficha - ${p.nome}${sufixo}`) + ".docx", await r.blob());
        })
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${nomeSeguro(p.nome)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      setEstado("");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={baixar} disabled={estado === "baixando"} title="Ficha, documentos e provas numa pasta .zip">
      {estado === "baixando" ? <Loader2 className="animate-spin" /> : <FolderDown />}
      {estado === "baixando" ? "Preparando…" : estado === "erro" ? "Falhou, tentar de novo" : "Baixar pasta"}
    </Button>
  );
}
