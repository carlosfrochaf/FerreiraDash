import { Scale } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-lg shadow-primary/5">
        <Scale className="h-8 w-8 animate-pulse" />
        <span className="absolute inset-0 rounded-2xl border border-primary/40 animate-ping opacity-25"></span>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight">Carregando painel...</p>
        <p className="text-xs text-muted-foreground mt-1">Obtendo dados do escritório...</p>
      </div>
    </div>
  );
}
