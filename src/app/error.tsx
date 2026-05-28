"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    console.error("Erro capturado pela página de erro global:", error);
  }, [error]);

  const isDatabaseError =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("prisma") ||
    error.message?.toLowerCase().includes("5432") ||
    error.message?.toLowerCase().includes("can't reach database") ||
    error.name === "PrismaClientInitializationError";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_50%_30%,rgba(239,68,68,0.06),transparent)]" />
      
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-rose-500/20 bg-card/60 p-6 backdrop-blur-xl shadow-2xl md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            {isDatabaseError ? <Database className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isDatabaseError ? "Falha na Conexão com o Banco de Dados" : "Ops! Ocorreu um problema"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Não foi possível carregar as informações necessárias para esta página.
            </p>
          </div>
        </div>

        {/* Error Details */}
        <div className="mt-6 rounded-lg bg-muted/50 border border-muted p-4 font-mono text-xs text-rose-500 overflow-x-auto max-h-40">
          {error.name && <span className="font-bold">{error.name}: </span>}
          {error.message || "Erro desconhecido durante a renderização."}
        </div>

        {/* Database Troubleshooting Guide */}
        {isDatabaseError && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Como resolver este problema:</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* SQLite Option */}
              <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opção A: Usar SQLite (Rápido)</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se você quer rodar o projeto localmente de forma simples sem precisar de Docker:
                </p>
                <div className="space-y-2">
                  <div className="relative rounded bg-muted/80 p-2 font-mono text-[11px] text-foreground flex items-center justify-between">
                    <code>npm run db:generate</code>
                    <button
                      onClick={() => handleCopy("npm run db:generate", "sqlite-gen")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copiar comando"
                    >
                      {copiedText === "sqlite-gen" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="relative rounded bg-muted/80 p-2 font-mono text-[11px] text-foreground flex items-center justify-between">
                    <code>npm run db:push</code>
                    <button
                      onClick={() => handleCopy("npm run db:push", "sqlite-push")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copiar comando"
                    >
                      {copiedText === "sqlite-push" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Garanta que <code>DATABASE_URL="file:./dev.db"</code> está ativo no seu <code>.env</code>.
                </p>
              </div>

              {/* PostgreSQL / Docker Option */}
              <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opção B: Usar PostgreSQL + Docker</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se você deseja rodar o PostgreSQL de produção definido no Docker Compose:
                </p>
                <div className="space-y-2">
                  <div className="relative rounded bg-muted/80 p-2 font-mono text-[11px] text-foreground flex items-center justify-between">
                    <code>docker compose up -d</code>
                    <button
                      onClick={() => handleCopy("docker compose up -d", "docker-up")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copiar comando"
                    >
                      {copiedText === "docker-up" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="relative rounded bg-muted/80 p-2 font-mono text-[11px] text-foreground flex items-center justify-between">
                    <code>npm run db:setup</code>
                    <button
                      onClick={() => handleCopy("npm run db:setup", "pg-setup")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Copiar comando"
                    >
                      {copiedText === "pg-setup" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Lembre de mudar o <code>provider = "postgresql"</code> no <code>schema.prisma</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-border/50 pt-6">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Recarregar Página
          </Button>
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
}
