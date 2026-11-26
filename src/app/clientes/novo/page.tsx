import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { usuarioAtual } from "@/lib/usuario-atual";

export default async function NovoClientePage() {
  await usuarioAtual();
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Novo cliente</h1>
      <ClienteForm />
    </div>
  );
}
