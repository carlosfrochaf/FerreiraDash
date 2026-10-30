"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Check, Copy, QrCode, Wallet } from "lucide-react";
import { Button } from "./button";
import { codigoPix } from "@/lib/pix";

type Props = {
  rotulo: string;
  pix: string | null;
  linkCadastro?: string;
  /** Com valor e nome, mostra "Pagar via Pix" (código Copia e Cola com chave e valor). */
  valor?: number | string | null;
  nome?: string;
};

/** Chave Pix com botão Copiar e, quando há valor, "Pagar via Pix" (Copia e Cola) e QR Code. */
export function PixCopiar({ rotulo, pix, linkCadastro, valor, nome }: Props) {
  const [copiado, setCopiado] = useState<"chave" | "codigo" | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const codigo = pix && valor ? codigoPix({ chave: pix, valor, nome: nome ?? "" }) : null;

  async function copiar(texto: string, qual: "chave" | "codigo") {
    try {
      await navigator.clipboard.writeText(texto);
      setFalhou(false);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), qual === "codigo" ? 6000 : 2000);
    } catch {
      setFalhou(true);
    }
  }

  async function alternarQr() {
    if (qr) return setQr(null);
    if (codigo) setQr(await QRCode.toDataURL(codigo, { margin: 1, width: 240 }));
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
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
        </div>
        {pix && (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copiar(pix, "chave")}>
            {copiado === "chave" ? <Check /> : <Copy />} {copiado === "chave" ? "Copiado" : "Copiar"}
          </Button>
        )}
      </div>

      {codigo && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={() => copiar(codigo, "codigo")}>
              {copiado === "codigo" ? <Check /> : <Wallet />} {copiado === "codigo" ? "Código copiado" : "Pagar via Pix"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={alternarQr} aria-pressed={!!qr} title="Mostrar QR Code">
              <QrCode />
            </Button>
          </div>
          {copiado === "codigo" && (
            <p className="text-xs text-emerald-300">Abra o app do banco em Pix → Copia e Cola e cole. Chave e valor já vão preenchidos.</p>
          )}
          {qr && (
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora (data URL) */}
              <img src={qr} alt="QR Code do Pix" width={240} height={240} />
              <p className="text-xs text-zinc-600">Aponte a câmera do app do banco</p>
            </div>
          )}
        </div>
      )}
      {pix && valor && !codigo && (
        <p className="text-xs text-muted-foreground">Formato da chave não reconhecido: use o Copiar e digite o valor no banco.</p>
      )}
      {falhou && <p className="text-xs text-rose-300">Não deu para copiar; selecione e copie manualmente.</p>}
    </div>
  );
}
