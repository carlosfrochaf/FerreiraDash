"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { linkComTexto, modelosDoMomento, preencher, PROVAS, type Momento } from "@/lib/mensagens";

export type ContextoWhatsapp = {
  temContrato: boolean;
  /** Próxima audiência já por extenso ("20/11 (sexta-feira) às 14:30"), ou null. */
  audiencia: string | null;
  faltam: string[];
  /** Ficha em que ficam guardadas as provas pedidas. */
  fichaId: string | null;
  provasPedidas: string[];
};

type Modelo = { id: string; nome: string; momento: Momento; texto: string };

/** Um só botão de WhatsApp: mostra só as mensagens do momento do cliente. */
export function WhatsappCliente({
  telefone,
  nome,
  escritorio,
  modelos,
  ctx,
  abrirAoCarregar = false,
}: {
  telefone: string;
  nome: string;
  escritorio: string;
  modelos: Modelo[];
  ctx: ContextoWhatsapp;
  abrirAoCarregar?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(abrirAoCarregar);
  const [escolhido, setEscolhido] = useState<Modelo | null>(null);
  const [provas, setProvas] = useState<string[]>(ctx.provasPedidas);
  const [texto, setTexto] = useState("");
  const [mexeu, setMexeu] = useState(false);

  const doMomento = useMemo(() => modelosDoMomento(modelos, { temContrato: ctx.temContrato, temAudiencia: !!ctx.audiencia }), [modelos, ctx]);
  const pedeProvas = !!escolhido?.texto.includes("{provas}");

  // Refaz o texto quando muda a mensagem ou as provas, até a pessoa editar à mão.
  useEffect(() => {
    if (!escolhido || mexeu) return;
    setTexto(preencher(escolhido.texto, { nome, escritorio, faltam: ctx.faltam, provas, audiencia: ctx.audiencia ?? "" }));
  }, [escolhido, provas, mexeu, nome, escritorio, ctx]);

  function escolher(m: Modelo | null) {
    setMexeu(false);
    setEscolhido(m);
    if (!m) setTexto("");
  }

  function fechar() {
    setAberto(false);
    escolher(null);
  }

  async function enviar() {
    const link = linkComTexto(telefone, texto);
    if (!link) return;
    window.open(link, "_blank", "noopener");
    // Guarda na ficha quais provas foram pedidas (o advogado também vê).
    if (pedeProvas && ctx.fichaId && provas.join("|") !== ctx.provasPedidas.join("|")) {
      await fetch(`/api/fichas/${ctx.fichaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provasPedidas: provas }) }).catch(() => null);
      router.refresh();
    }
    fechar();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        <MessageCircle /> WhatsApp
      </Button>
      <Modal aberto={aberto} onFechar={fechar} titulo={`WhatsApp para ${nome}`}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {doMomento.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => escolher(m)}
                className={`rounded-full border px-3 py-1.5 text-sm ${escolhido?.id === m.id ? "border-primary bg-primary/15 font-semibold" : "border-border hover:bg-accent"}`}
              >
                {m.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                escolher(null);
                setMexeu(true);
                setTexto(`Olá, ${nome.split(" ")[0]}! `);
              }}
              className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Mensagem livre
            </button>
          </div>

          {pedeProvas && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provas para pedir</p>
              <div className="flex flex-wrap gap-1.5">
                {PROVAS.map((p) => {
                  const on = provas.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvas((l) => (on ? l.filter((x) => x !== p) : [...l, p]))}
                      className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/15 font-semibold" : "border-border hover:bg-accent"}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(escolhido || mexeu) && (
            <>
              <textarea
                className="h-48 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={texto}
                onChange={(e) => {
                  setMexeu(true);
                  setTexto(e.target.value);
                }}
              />
              <Button type="button" className="w-full" disabled={!texto.trim()} onClick={enviar}>
                <Send /> Abrir no WhatsApp
              </Button>
            </>
          )}
          {doMomento.length === 0 && !mexeu && <p className="text-xs text-muted-foreground">Nenhuma mensagem pronta para este momento. Ajuste em Mensagens.</p>}
        </div>
      </Modal>
    </>
  );
}
