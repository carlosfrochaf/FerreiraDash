"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, ArrowLeftRight, Scale, FolderEdit, History, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NotificationBell } from "./notification-bell";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos/novo", label: "Lançamento", icon: PlusCircle },
  { href: "/repasse", label: "Repasse", icon: ArrowLeftRight },
  { href: "/historico", label: "Histórico", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");

  async function handleResetDb() {
    if (confirmText !== "APAGAR") return;
    setIsResetting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/reset-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao apagar registros.");
      }

      setIsResetOpen(false);
      setConfirmText("");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de rede ao resetar banco.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Financeiro Jurídico</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsResetOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              title="Apagar Todos os Registros"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <NotificationBell />
            <Link
              href="/categorias"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <FolderEdit className="h-3.5 w-3.5" />
              <span>Categorias</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28">{children}</main>

      {/* Confirmation Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-card/90 p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Apagar Todos os Registros?</h2>
            </div>
            
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Esta ação excluirá permanentemente todos os **lançamentos, repasses, contatos e processos** de teste.
            </p>
            
            <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-xs text-red-200/90 font-medium">
              ⚠️ <strong>O que será mantido:</strong> Suas categorias e inscrições de notificações não serão apagadas. Esta ação não pode ser desfeita.
            </div>

            <div className="mt-4">
              <label htmlFor="confirmInput" className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Digite a palavra <span className="text-red-400 font-bold">APAGAR</span> abaixo para confirmar:
              </label>
              <input
                id="confirmInput"
                type="text"
                placeholder="Digite aqui..."
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-red-500/40 transition-colors"
                disabled={isResetting}
              />
              {error && <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isResetting) {
                    setIsResetOpen(false);
                    setConfirmText("");
                    setError("");
                  }
                }}
                disabled={isResetting}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetDb}
                disabled={confirmText !== "APAGAR" || isResetting}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Apagando...
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 py-2">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.split("?")[0]);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
