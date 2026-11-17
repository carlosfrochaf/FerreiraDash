"use client";

import { useRef, useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Extracao } from "@/lib/conversa-ficha";
import { audiosCitados, juntarTranscricoes } from "@/lib/audios-conversa";

type Msg = { ok: boolean; texto: string };

const ehZip = async (f: File) => {
  const b = new Uint8Array(await f.slice(0, 2).arrayBuffer());
  return b[0] === 0x50 && b[1] === 0x4b;
};

/** Botão que lê a conversa exportada do WhatsApp (com os áudios) e devolve os dados para a ficha juntar. */
export function PreencherPelaConversa({
  fichaId,
  audioAtivo,
  aoReceber,
}: {
  fichaId: string;
  audioAtivo: boolean;
  aoReceber: (e: Extracao) => number;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);

  /** Texto da conversa com os áudios já trocados pelo que foi dito. Avisos vão em `avisos`. */
  async function montarTexto(arquivo: File, avisos: Msg[]): Promise<string | null> {
    if (!(await ehZip(arquivo))) {
      const texto = await arquivo.text();
      if (/<(M[íi]dia oculta|Media omitted)>/i.test(texto)) {
        avisos.push({ ok: false, texto: "Essa conversa foi exportada sem mídia: os áudios ficaram de fora. Para incluir, exporte com mídia." });
      }
      return texto;
    }
    setEtapa("Abrindo o arquivo…");
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(arquivo).catch(() => null);
    if (!zip) {
      setMsgs([{ ok: false, texto: "Não consegui abrir o .zip." }]);
      return null;
    }
    const arquivos = Object.values(zip.files).filter((f) => !f.dir);
    const txts = arquivos.filter((f) => /\.txt$/i.test(f.name));
    if (txts.length === 0) {
      setMsgs([{ ok: false, texto: "O .zip não tem a conversa. Exporte de novo pelo WhatsApp." }]);
      return null;
    }
    const texto = (await Promise.all(txts.map((f) => f.async("string")))).sort((a, b) => b.length - a.length)[0];
    const porNome = new Map(arquivos.map((f) => [f.name.split("/").pop() ?? f.name, f]));
    const audios = audiosCitados(texto).filter((n) => porNome.has(n));
    if (audios.length === 0) return texto;
    if (!audioAtivo) {
      avisos.push({ ok: false, texto: `${audios.length} áudio(s) não foram ouvidos: a leitura de áudios ainda não está ativada.` });
      return texto;
    }

    const transcricoes: Record<string, string> = {};
    let feitos = 0;
    let falhas = 0;
    let parar: string | null = null;
    setEtapa(`Ouvindo os áudios: 0 de ${audios.length}…`);
    const fila = [...audios];
    // Três de cada vez: rápido sem sobrecarregar o servidor.
    await Promise.all(
      Array.from({ length: Math.min(3, fila.length) }, async () => {
        for (let nome = fila.shift(); nome && !parar; nome = fila.shift()) {
          const corpo = new FormData();
          corpo.append("audio", new File([await porNome.get(nome)!.async("blob")], nome));
          const res = await fetch(`/api/fichas/${fichaId}/audio`, { method: "POST", body: corpo }).catch(() => null);
          const j = await res?.json().catch(() => ({}));
          if (res?.ok && typeof j?.texto === "string") transcricoes[nome] = j.texto;
          else {
            falhas++;
            // Sem chave ou sem crédito: não adianta tentar os outros.
            if (res?.status === 503) parar = j?.error ?? "A leitura de áudios não está disponível agora.";
          }
          feitos++;
          setEtapa(`Ouvindo os áudios: ${feitos} de ${audios.length}…`);
        }
      }),
    );
    if (parar) avisos.push({ ok: false, texto: `${parar} Os áudios que faltaram ficaram de fora.` });
    else if (falhas) avisos.push({ ok: false, texto: `${falhas} áudio(s) não puderam ser ouvidos e ficaram de fora.` });
    return juntarTranscricoes(texto, transcricoes);
  }

  async function enviar(arquivo: File) {
    setMsgs([]);
    const avisos: Msg[] = [];
    try {
      const texto = await montarTexto(arquivo, avisos);
      if (texto === null) return;
      setEtapa("Lendo a conversa e preenchendo a ficha…");
      const corpo = new FormData();
      corpo.append("arquivo", new File([texto], "conversa.txt", { type: "text/plain" }));
      const res = await fetch(`/api/fichas/${fichaId}/conversa`, { method: "POST", body: corpo }).catch(() => null);
      const j = await res?.json().catch(() => ({}));
      if (!res?.ok || !j?.extracao) return setMsgs([...avisos, { ok: false, texto: j?.error ?? "Não foi possível ler a conversa." }]);
      const n = aoReceber(j.extracao as Extracao);
      setMsgs([
        n > 0
          ? { ok: true, texto: `Preenchi ${n} ${n === 1 ? "campo" : "campos"} pela conversa. Confira e clique em Salvar.` }
          : { ok: true, texto: "Não achei nada novo na conversa para preencher." },
        ...avisos,
      ]);
    } finally {
      setEtapa(null);
    }
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-dashed border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          No WhatsApp: abra a conversa → ⋮ Mais → <b>Exportar conversa</b> → <b>incluir mídia</b> (para ouvir os áudios).
        </p>
        <Button type="button" variant="outline" size="sm" disabled={!!etapa} onClick={() => entrada.current?.click()}>
          {etapa ? <Loader2 className="animate-spin" /> : <MessageSquareText />} Preencher pela conversa
        </Button>
      </div>
      <input
        ref={entrada}
        type="file"
        accept=".txt,.zip,text/plain,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void enviar(f);
        }}
      />
      {etapa && <p className="text-xs text-muted-foreground">{etapa} Isso pode levar alguns minutos.</p>}
      {msgs.map((m, i) => (
        <p key={i} className={`text-xs ${m.ok ? "text-emerald-400" : "text-amber-300"}`}>
          {m.texto}
        </p>
      ))}
    </div>
  );
}
