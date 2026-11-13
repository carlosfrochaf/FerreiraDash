"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, FileText, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoEscolha } from "@/components/ui/campo-escolha";
import { formatarDataCurta } from "@/lib/datas";
import { arquivoAceito, documentosFaltando, rotuloTipo, TIPOS_DA_CAUSA, TIPOS_PESSOAIS, type TipoDoc } from "@/lib/documentos";

export type DocumentoDaFicha = {
  id: string;
  tipo: TipoDoc;
  nome: string;
  mime: string;
  tamanho: number;
  recebimentoId: string | null;
  enviadoEm: string;
};

type Causa = { id: string; titulo: string };

function tamanhoLegivel(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentosCliente({
  clienteId,
  documentos,
  causas,
  storagePronto,
  podeEditar = true,
  cpf,
}: {
  clienteId: string;
  documentos: DocumentoDaFicha[];
  causas: Causa[];
  storagePronto: boolean;
  podeEditar?: boolean;
  /** Número do CPF do cadastro (o CPF é digitado, não é foto). */
  cpf?: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoDoc>("RG_CNH");
  const [causa, setCausa] = useState("");
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const faltando = documentosFaltando(documentos, causas, cpf ?? null);
  const pessoais = documentos.filter((d) => !d.recebimentoId);

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro("");
    const erros: string[] = [];
    for (const [i, a] of [...arquivos].entries()) {
      const problema = arquivoAceito(a.type, a.size);
      if (problema) {
        erros.push(`${a.name}: ${problema}`);
        continue;
      }
      setEnviando(`Enviando ${i + 1} de ${arquivos.length}…`);
      const fd = new FormData();
      fd.append("arquivo", a);
      fd.append("clienteId", clienteId);
      fd.append("tipo", tipo);
      if (causa) fd.append("recebimentoId", causa);
      const res = await fetch("/api/documentos", { method: "POST", body: fd }).catch(() => null);
      if (!res?.ok) {
        const d = await res?.json().catch(() => ({}));
        erros.push(typeof d?.error === "string" ? d.error : `${a.name}: não foi enviado.`);
      }
    }
    setEnviando("");
    if (input.current) input.current.value = "";
    if (erros.length) setErro(erros.join(" "));
    router.refresh();
  }

  function renomear(d: DocumentoDaFicha) {
    const nome = prompt("Novo nome do documento:", d.nome)?.trim();
    if (!nome || nome === d.nome) return;
    startTransition(async () => {
      await fetch(`/api/documentos/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
      router.refresh();
    });
  }

  function apagar(d: DocumentoDaFicha) {
    if (!confirm(`Apagar "${d.nome}"? O arquivo some de vez.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/documentos/${d.id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) setErro("Não foi possível apagar agora. Tente de novo.");
      router.refresh();
    });
  }

  const Lista = ({ itens, vazio }: { itens: DocumentoDaFicha[]; vazio: string }) =>
    itens.length === 0 ? (
      <p className="px-3 py-2 text-xs text-muted-foreground">{vazio}</p>
    ) : (
      <ul className="divide-y divide-border/60">
        {itens.map((d) => (
          <li key={d.id} className="flex items-center gap-2 px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.nome}</p>
              <p className="text-[11px] text-muted-foreground">
                {rotuloTipo(d.tipo)} · {formatarDataCurta(d.enviadoEm.slice(0, 10))} · {tamanhoLegivel(d.tamanho)}
              </p>
            </div>
            <a href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" title="Ver" aria-label="Ver">
              <Eye className="h-4 w-4" />
            </a>
            <a href={`/api/documentos/${d.id}?baixar=1`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" title="Baixar" aria-label="Baixar">
              <Download className="h-4 w-4" />
            </a>
            {podeEditar && <button type="button" onClick={() => renomear(d)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" title="Renomear" aria-label="Renomear">
              <Pencil className="h-4 w-4" />
            </button>}
            {podeEditar && <button type="button" onClick={() => apagar(d)} disabled={pending} className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300" title="Apagar" aria-label="Apagar">
              <Trash2 className="h-4 w-4" />
            </button>}
          </li>
        ))}
      </ul>
    );

  const textoFalta = (l: TipoDoc[]) => l.map(rotuloTipo).join(", ").toLowerCase();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Documentos</h2>

      {(faltando.cpf || faltando.pessoais.length > 0 || Object.keys(faltando.porCausa).length > 0) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          {faltando.cpf && <p>Falta o número do CPF: digite em &quot;Editar dados&quot;.</p>}
          {faltando.pessoais.length > 0 && <p>Falta foto: {textoFalta(faltando.pessoais)}.</p>}
          {causas
            .filter((c) => faltando.porCausa[c.id])
            .map((c) => (
              <p key={c.id}>
                {c.titulo}: falta {textoFalta(faltando.porCausa[c.id])}.
              </p>
            ))}
        </div>
      )}

      {!podeEditar ? null : storagePronto ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <CampoEscolha value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc)} aria-label="Tipo do documento">
              <optgroup label="Pessoais">
                {TIPOS_PESSOAIS.map((t) => (
                  <option key={t} value={t}>
                    {rotuloTipo(t)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Da causa">
                {TIPOS_DA_CAUSA.map((t) => (
                  <option key={t} value={t}>
                    {rotuloTipo(t)}
                  </option>
                ))}
              </optgroup>
              <option value="OUTRO">Outro</option>
            </CampoEscolha>
            <CampoEscolha value={causa} onChange={(e) => setCausa(e.target.value)} aria-label="Causa">
              <option value="">Sem causa (documento pessoal)</option>
              {causas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </CampoEscolha>
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => enviar(e.target.files)}
          />
          <Button type="button" variant="outline" className="w-full" disabled={!!enviando} onClick={() => input.current?.click()}>
            {enviando ? <Loader2 className="animate-spin" /> : <Upload />} {enviando || "Enviar arquivos (foto ou PDF, até 10 MB)"}
          </Button>
          {erro && <p className="text-xs text-rose-300">{erro}</p>}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Documentos ainda não configurados neste ambiente.
        </p>
      )}

      <div className="rounded-xl border border-border bg-card">
        <p className="border-b border-border/60 px-3 py-2 text-xs font-semibold">Pessoais</p>
        <Lista itens={pessoais} vazio="Nenhum documento pessoal." />
      </div>
      {causas.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-card">
          <p className="border-b border-border/60 px-3 py-2 text-xs font-semibold">{c.titulo}</p>
          <Lista itens={documentos.filter((d) => d.recebimentoId === c.id)} vazio="Nenhum documento desta causa." />
        </div>
      ))}
    </section>
  );
}
