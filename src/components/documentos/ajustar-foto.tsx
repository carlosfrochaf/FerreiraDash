"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  acharCantos,
  CANTOS_PADRAO,
  clarear,
  documento,
  endireitar,
  girarCantos,
  tamanhoEndireitado,
  type Pixels,
  type Ponto,
} from "@/lib/ajuste-foto";

type Modo = "original" | "clarear" | "documento";
const MODOS: { valor: Modo; rotulo: string }[] = [
  { valor: "original", rotulo: "Original" },
  { valor: "clarear", rotulo: "Clarear" },
  { valor: "documento", rotulo: "Preto e branco" },
];
const MAX = 2000; // lado maior da foto final
const TELA = 900; // lado maior da prévia

function novoCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Abre a foto num canvas de no máximo 2000 px. */
async function abrir(arquivo: File): Promise<HTMLCanvasElement> {
  let img: CanvasImageSource & { width: number; height: number };
  try {
    img = await createImageBitmap(arquivo);
  } catch {
    const url = URL.createObjectURL(arquivo);
    try {
      const el = new Image();
      el.src = url;
      await el.decode();
      img = el;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const f = Math.min(1, MAX / Math.max(img.width, img.height));
  const c = novoCanvas(Math.round(img.width * f), Math.round(img.height * f));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function reduzido(base: HTMLCanvasElement, lado: number): HTMLCanvasElement {
  const f = Math.min(1, lado / Math.max(base.width, base.height));
  const c = novoCanvas(Math.max(1, Math.round(base.width * f)), Math.max(1, Math.round(base.height * f)));
  c.getContext("2d")!.drawImage(base, 0, 0, c.width, c.height);
  return c;
}

const pixels = (c: HTMLCanvasElement): Pixels => c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
const emImageData = (p: Pixels) => new ImageData(new Uint8ClampedArray(p.data), p.width, p.height);

function realce(p: Pixels, modo: Modo): Pixels {
  return modo === "clarear" ? clarear(p) : modo === "documento" ? documento(p) : p;
}

function girar(base: HTMLCanvasElement): HTMLCanvasElement {
  const c = novoCanvas(base.height, base.width);
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(base, 0, 0);
  return c;
}

/**
 * Tela para acertar fotos de documento antes de virar PDF: arrastar as 4 pontas (endireita e corta),
 * girar e clarear. Devolve as fotos ajustadas (JPEG), na mesma ordem.
 */
export function AjustarFoto({
  arquivos,
  onPronto,
  onCancelar,
}: {
  arquivos: File[];
  onPronto: (ajustadas: File[]) => void;
  onCancelar: () => void;
}) {
  const [i, setI] = useState(0);
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [cantos, setCantos] = useState<Ponto[]>(CANTOS_PADRAO);
  const [modo, setModo] = useState<Modo>("original");
  const [ocupado, setOcupado] = useState(true);
  const [erro, setErro] = useState("");
  const prontas = useRef<File[]>([]);
  const tela = useRef<HTMLCanvasElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const arrastando = useRef<number | null>(null);

  // Abre a foto da vez e procura as pontas do papel.
  useEffect(() => {
    let vivo = true;
    setOcupado(true);
    setErro("");
    abrir(arquivos[i])
      .then((c) => {
        if (!vivo) return;
        setBase(c);
        setCantos(acharCantos(pixels(reduzido(c, 400))) ?? CANTOS_PADRAO);
        setModo("original");
      })
      .catch(() => vivo && setErro(`Não foi possível abrir ${arquivos[i].name}.`))
      .finally(() => vivo && setOcupado(false));
    return () => {
      vivo = false;
    };
  }, [arquivos, i]);

  // Prévia com o realce escolhido.
  useEffect(() => {
    if (!base || !tela.current) return;
    const p = reduzido(base, TELA);
    const c = tela.current;
    c.width = p.width;
    c.height = p.height;
    c.getContext("2d")!.putImageData(emImageData(realce(pixels(p), modo)), 0, 0);
  }, [base, modo]);

  const mover = useCallback((e: React.PointerEvent) => {
    const k = arrastando.current;
    if (k === null || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setCantos((c) => c.map((p, j) => (j === k ? { x, y } : p)));
  }, []);

  function seguir(foto: File) {
    prontas.current.push(foto);
    if (i + 1 < arquivos.length) setI(i + 1);
    else onPronto(prontas.current);
  }

  async function pronto() {
    if (!base) return;
    setOcupado(true);
    await new Promise((r) => setTimeout(r, 30)); // deixa a tela mostrar "Ajustando…"
    try {
      const px = cantos.map((p) => ({ x: p.x * (base.width - 1), y: p.y * (base.height - 1) }));
      const t = tamanhoEndireitado(px);
      const f = Math.min(1, MAX / Math.max(t.largura, t.altura));
      const w = Math.max(1, Math.round(t.largura * f));
      const h = Math.max(1, Math.round(t.altura * f));
      const saida = realce(endireitar(pixels(base), px, w, h), modo);
      const c = novoCanvas(w, h);
      c.getContext("2d")!.putImageData(emImageData(saida), 0, 0);
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
      if (!blob) throw new Error();
      const nome = arquivos[i].name.replace(/\.[^./\\]+$/, "") + ".jpg";
      seguir(new File([blob], nome, { type: "image/jpeg" }));
    } catch {
      setErro("Não foi possível ajustar esta foto. Use “Sem ajuste”.");
    } finally {
      setOcupado(false);
    }
  }

  // Mesmo tamanho da prévia (reduzido a TELA px).
  const fTela = base ? Math.min(1, TELA / Math.max(base.width, base.height)) : 1;
  const w = base ? Math.max(1, Math.round(base.width * fTela)) : 1;
  const h = base ? Math.max(1, Math.round(base.height * fTela)) : 1;
  const raio = Math.max(w, h) * 0.025;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3 text-white sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <p className="font-semibold">
          Ajustar foto {arquivos.length > 1 ? `${i + 1} de ${arquivos.length}` : ""}
        </p>
        <p className="hidden text-white/60 sm:block">Arraste as 4 bolinhas até as pontas do documento.</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        {erro ? (
          <p className="text-sm text-rose-300">{erro}</p>
        ) : (
          <div className="relative max-h-full max-w-full">
            <canvas ref={tela} className="block max-h-[calc(100vh-11rem)] max-w-full touch-none" />
            {base && (
              <svg
                ref={svg}
                viewBox={`0 0 ${w} ${h}`}
                className="absolute inset-0 h-full w-full touch-none"
                onPointerMove={mover}
                onPointerUp={() => (arrastando.current = null)}
                onPointerCancel={() => (arrastando.current = null)}
              >
                <polygon
                  points={cantos.map((p) => `${p.x * w},${p.y * h}`).join(" ")}
                  fill="rgba(212,175,55,0.12)"
                  stroke="#d4af37"
                  strokeWidth={raio / 4}
                />
                {cantos.map((p, k) => (
                  <circle
                    key={k}
                    cx={p.x * w}
                    cy={p.y * h}
                    r={raio}
                    fill="rgba(212,175,55,0.35)"
                    stroke="#fff"
                    strokeWidth={raio / 5}
                    className="cursor-grab"
                    onPointerDown={(e) => {
                      arrastando.current = k;
                      svg.current?.setPointerCapture(e.pointerId);
                    }}
                  />
                ))}
              </svg>
            )}
            {ocupado && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex rounded-lg border border-white/20 p-0.5">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => setModo(m.valor)}
                className={cn("rounded-md px-3 py-1.5 text-sm", modo === m.valor ? "bg-white text-black" : "text-white/80")}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!base || ocupado}
            onClick={() => {
              if (!base) return;
              setBase(girar(base));
              setCantos(girarCantos(cantos));
            }}
          >
            <RotateCw /> Girar
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!base} onClick={() => setCantos([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])}>
            Foto inteira
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={() => seguir(arquivos[i])} disabled={ocupado && !erro}>
            Sem ajuste
          </Button>
          <Button type="button" onClick={pronto} disabled={!base || ocupado || !!erro}>
            {i + 1 < arquivos.length ? "Pronto, próxima" : "Pronto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
