import { Loader2 } from "lucide-react";

// Aparece na hora ao abrir a lista de clientes.
export default function CarregandoClientes() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes…
      </p>
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
