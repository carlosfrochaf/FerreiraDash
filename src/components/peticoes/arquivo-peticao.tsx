"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arquivoAceito } from "@/lib/documentos";
import { paraPdf } from "@/lib/pdf-imagem";

/** Arquivo da petição: abre os já enviados e envia um novo (vai para os documentos do cliente como "Petição"). */
export function ArquivoPeticao({
  peticaoId,
  clienteId,
  arquivos,
  podeEnviar,
}: {
  peticaoId: string;
  clienteId: string | null;
  arquivos: { id: string; nome: string }[];
  podeEnviar: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState(arquivos);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");

  async function enviar(escolhidos: FileList | null) {
    if (!escolhidos?.length || !clienteId) return;
    setErro("");
    try {
      setStatus("Convertendo para PDF…");
      const [pdf] = await paraPdf([...escolhidos], true);
      const problema = arquivoAceito(pdf.type, pdf.size);
      if (problema) throw new Error(`${pdf.name}: ${problema}`);
      setStatus("Enviando…");
      const fd = new FormData();
      fd.append("arquivo", pdf);
      fd.append("clienteId", clienteId);
      fd.append("peticaoId", peticaoId);
      const res = await fetch("/api/documentos", { method: "POST", body: fd }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) throw new Error(typeof d?.error === "string" ? d.error : "Não foi possível enviar o arquivo.");
      setLista((l) => [{ id: d.id, nome: pdf.name }, ...l]);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setStatus("");
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arquivo da petição</p>
      {lista.length > 0 ? (
        <ul className="space-y-1">
          {lista.map((a) => (
            <li key={a.id}>
              <a href={`/api/documentos/${a.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="truncate">{a.nome}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum arquivo enviado.</p>
      )}
      {!clienteId ? (
        <p className="text-xs text-amber-200">Ligue esta petição a um cliente para anexar o arquivo.</p>
      ) : (
        podeEnviar && (
          <>
            <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => enviar(e.target.files)} />
            <Button type="button" variant="outline" size="sm" disabled={!!status} onClick={() => input.current?.click()}>
              {status ? <Loader2 className="animate-spin" /> : <Upload />} {status || (lista.length ? "Trocar arquivo (PDF)" : "Enviar arquivo (PDF)")}
            </Button>
          </>
        )
      )}
      {erro && <p className="text-xs text-rose-300">{erro}</p>}
    </div>
  );
}
