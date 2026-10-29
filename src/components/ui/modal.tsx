"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: React.ReactNode;
};

/** Janela modal simples: fecha com Esc, clique fora ou no X. Vira "folha" no celular. */
export function Modal({ aberto, onFechar, titulo, children }: Props) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-w-md sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold leading-tight">{titulo}</h2>
          <button
            onClick={onFechar}
            className="-m-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
