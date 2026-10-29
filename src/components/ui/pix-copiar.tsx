"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

/** Mostra uma chave Pix com botão Copiar (ou link para cadastrar, se não houver). */
export function PixCopiar({ rotulo, pix, linkCadastro }: { rotulo: string; pix: string | null; linkCadastro?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setFalhou(true);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        {pix ? (
          <p className="break-all font-mono text-sm">{pix}</p>
        ) : (
          <p className="text-sm text-amber-300">
            Não cadastrado
            {linkCadastro && (
              <>
                {" · "}
                <Link href={linkCadastro} className="underline">
                  cadastrar
                </Link>
              </>
            )}
          </p>
        )}
        {falhou && <p className="text-xs text-rose-300">Não deu para copiar; selecione e copie a chave.</p>}
      </div>
      {pix && (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copiar}>
          {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar"}
        </Button>
      )}
    </div>
  );
}
