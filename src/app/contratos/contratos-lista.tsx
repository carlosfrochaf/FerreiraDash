import { FileSignature, FileText, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROTULO_ARQUIVO, type ArquivoAssinado } from "@/lib/zapsign";

export type ContratoTela = {
  id: string;
  titulo: string;
  cliente: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  assinadoEm: string;
  novo: boolean;
  arquivos: ArquivoAssinado[];
};

const cpfFormatado = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
const telFormatado = (t: string) => t.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

export function ContratosLista({ contratos }: { contratos: ContratoTela[] }) {
  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
        <FileSignature className="h-9 w-9 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum contrato assinado ainda.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {contratos.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {c.novo && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">Novo</span>}
              <span className="text-xs text-muted-foreground">
                Assinado em {new Date(c.assinadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </span>
            </div>
            <p className="font-semibold">{c.cliente}</p>
            <p className="text-xs text-muted-foreground">
              {[c.cpf && `CPF ${cpfFormatado(c.cpf)}`, c.telefone && telFormatado(c.telefone), c.email].filter(Boolean).join(" · ") || c.titulo}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {c.arquivos.map((a) => (
                <a
                  key={a.token}
                  href={`/api/contratos/${c.id}/arquivo?arquivo=${encodeURIComponent(a.token)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <FileText className="h-3.5 w-3.5" /> {a.tipo === "OUTRO" ? a.nome : ROTULO_ARQUIVO[a.tipo]}
                </a>
              ))}
              {c.telefone && (
                <a
                  href={`https://wa.me/55${c.telefone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
